# file-picker — deployment

## TL;DR

**Deployment is manual.** Pushing to `staging-dev`, `staging-sandbox`, or `production` does **not** kick off a build. To deploy:

1. Push your changes to the appropriate branch.
2. Open the AWS CodeBuild console in **us-east-1**.
3. Pick the corresponding project (table below) and click **Start build**.
4. Watch the build run. When it finishes, the new bundle is in S3 and CloudFront is invalidated.

`source_version` is hard-coded per CodeBuild project, so **Start build** always pulls the latest commit from the matching branch — you don't need to pass any overrides.

## Environments

| Branch | CodeBuild project | Buildspec | S3 bucket | CloudFront ID | Base URL |
|---|---|---|---|---|---|
| `staging-dev` | `File-picker-dev` | `buildspec.yml` | `wi-content-dev` | `E10ZRDMO2003HM` | `apigw.dev.webinfinity.com` |
| `staging-sandbox` | `File-picker-sandbox` | `buildspec-sandbox.yml` | `wi-content-sandbox` | `EQ6CXEKI0O5D0` | `apigw.sandbox.webinfinity.com` |
| `production` | `File-picker-live` | `buildspec-live.yml` | `wi-content` | `E1GLMIBN5ABY2K` | `apigw.webinfinity.com` |

AWS account for dev and sandbox: `360ecosystems-dev` (`806392157750`). Production lives in a separate account.

Built bundles are served from `cdn.{dev.|sandbox.|}webinfinity.com/filesync/`.

## What a build does

Each buildspec runs the same pipeline:

1. `yarn install` (Yarn 4 via `.yarnrc.yml`)
2. `yarn run install-deps` (legacy `bower install` for `cldr-data` etc.)
3. `BASE_URL=... PICKER_URL=... npm run build` — Webpack produces `dist/`
4. `aws s3 sync dist s3://<bucket>/filesync/ --delete --cache-control no-cache`
5. `aws cloudfront create-invalidation --distribution-id <id> --paths "/filesync/*"`

The only thing that differs between environments is the env-var values injected at step 3 (and therefore the S3 + CloudFront targets at steps 4–5).

## Watching a build

**Console:** AWS CodeBuild → `File-picker-{dev,sandbox,live}` → Build history. Click a build to see real-time phase output.

**Direct URLs:**

- Dev: https://us-east-1.console.aws.amazon.com/codesuite/codebuild/projects/File-picker-dev
- Sandbox: https://us-east-1.console.aws.amazon.com/codesuite/codebuild/projects/File-picker-sandbox
- Live: https://us-east-1.console.aws.amazon.com/codesuite/codebuild/projects/File-picker-live

**CloudWatch logs:** `/aws/codebuild/File-picker-{dev,sandbox,live}` (us-east-1). The dev and sandbox log groups are defined in [Deployment/Terraform/awsdev/wienv/core.tf:2752](../../Deployment/Terraform/awsdev/wienv/core.tf#L2752) with 365-day retention. The prod log group is created by AWS automatically.

**No notifications.** There are no SNS topics, Slack hooks, or email alerts wired up to build success/failure events. Success has to be checked manually.

## Why deploys are manual (history)

Previously, **TeamCity** watched each branch via VCS triggers and called [Deployment/PowerShellScripts/Invoke-CBProject.ps1](../../Deployment/PowerShellScripts/Invoke-CBProject.ps1) to start the corresponding CodeBuild project automatically. Push → TeamCity → CodeBuild → S3 + CloudFront.

TeamCity has since been decommissioned. The TeamCity configs under [Deployment/.teamcity/FilePicker/](../../Deployment/.teamcity/FilePicker/) remain in the tree but are inactive. The CodeBuild projects themselves still work — they just lost their auto-trigger.

The Terraform definitions for the projects ([Deployment/Terraform/awsdev/wienv/core.tf:2758](../../Deployment/Terraform/awsdev/wienv/core.tf#L2758) for dev/sandbox, [Deployment/Terraform/awsprod/global/lambda.tf:187](../../Deployment/Terraform/awsprod/global/lambda.tf#L187) for prod) do **not** declare any `aws_codebuild_webhook` resource, so GitHub push events never reach CodeBuild directly.

## Restoring automatic deploys (if/when desired)

Three reasonable paths:

1. **GitHub Actions** — a workflow in `.github/workflows/` that authenticates via OIDC and calls `aws codebuild start-build --project-name File-picker-<env> --source-version /refs/heads/<branch>`. Most modern option and keeps the trigger logic visible in the file-picker repo itself.
2. **CodeBuild webhook** — add `aws_codebuild_webhook` resources in Terraform with branch filters. CodeBuild subscribes to GitHub pushes directly.
3. **CodePipeline + CodeStar connection** — heavier setup; only worth it if you want multi-stage flow (e.g. dev → manual approval → sandbox).

## Branch convention

Feature branches only. Never push directly to `staging-dev`, `staging-sandbox`, `master`, or `production`. The repo has multiple long-lived branches that get periodically merged.
