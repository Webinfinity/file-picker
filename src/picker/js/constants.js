const FLAVOR = {
  saver: 'saver',
  chooser: 'chooser',
  dropzone: 'dropzone',
};

const VIEW = {
  accounts: 'accounts',
  files: 'files',
  search: 'search',
  computer: 'computer',
  dropzone: 'dropzone',
  addConfirm: 'addConfirm',
};

const TYPE_ALIAS = {
  all: ['files', 'folders'],
  text: [
    'applescript', 'as', 'as3', 'c', 'cc', 'clisp', 'coffee', 'cpp', 'cs',
    'css', 'csv', 'cxx', 'def', 'diff', 'erl', 'fountain', 'ft', 'h', 'hpp',
    'htm', 'html', 'hxx', 'inc', 'ini', 'java', 'js', 'json', 'less', 'log',
    'lua', 'm', 'markdown', 'mat', 'md', 'mdown', 'mkdn', 'mm', 'mustache',
    'mxml', 'patch', 'php', 'phtml', 'pl', 'plist', 'properties', 'py', 'rb',
    'sass', 'scss', 'sh', 'shtml', 'sql', 'tab', 'taskpaper', 'tex', 'text',
    'tmpl', 'tsv', 'txt', 'url', 'vb', 'xhtml', 'xml', 'yaml', 'yml', '',
  ],
  documents: [
    'csv', 'doc', 'dochtml', 'docm', 'docx', 'docxml', 'dot', 'dothtml',
    'dotm', 'dotx', 'eps', 'fdf', 'key', 'keynote', 'kth', 'mpd', 'mpp', 'mpt',
    'mpx', 'nmbtemplate', 'numbers', 'odc', 'odg', 'odp', 'ods', 'odt', 'pages',
    'pdf', 'pdfxml', 'pot', 'pothtml', 'potm', 'potx', 'ppa', 'ppam', 'pps',
    'ppsm', 'ppsx', 'ppt', 'ppthtml', 'pptm', 'pptx', 'pptxml', 'prn', 'ps',
    'pwz', 'rtf', 'tab', 'template', 'tsv', 'txt', 'vdx', 'vsd', 'vss', 'vst',
    'vsx', 'vtx', 'wbk', 'wiz', 'wpd', 'wps', 'xdf', 'xdp', 'xlam', 'xll',
    'xlr', 'xls', 'xlsb', 'xlsm', 'xlsx', 'xltm', 'xltx', 'xps',
  ],
  images: [
    'bmp', 'cr2', 'gif', 'ico', 'ithmb', 'jpeg', 'jpg', 'nef', 'png', 'raw',
    'svg', 'tif', 'tiff', 'wbmp', 'webp',
  ],
  videos: [
    '3g2', '3gp', '3gpp', '3gpp2', 'asf', 'avi', 'dv', 'dvi', 'flv', 'm2t',
    'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'ogv', 'ogx', 'rm',
    'rmvb', 'ts', 'vob', 'webm', 'wmv',
  ],
  audio: [
    'aac', 'aif', 'aifc', 'aiff', 'au', 'flac', 'm4a', 'm4b', 'm4p', 'm4r',
    'mid', 'mp3', 'oga', 'ogg', 'opus', 'ra', 'ram', 'spx', 'wav', 'wma',
  ],
  ebooks: [
    'acsm', 'aeh', 'azw', 'cb7', 'cba', 'cbr', 'cbt', 'cbz', 'ceb', 'chm',
    'epub', 'fb2', 'ibooks', 'kf8', 'lit', 'lrf', 'lrx', 'mobi', 'opf', 'oxps',
    'pdf', 'pdg', 'prc', 'tebr', 'tr2', 'tr3', 'xeb', 'xps',
  ],
  archives: [
    'zip'
  ]
};

const MIME_TYPE_ALIAS = {
  text: [
    'application/octet-stream',
  ],
  documents: [
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.drawing',
    'application/vnd.google-apps.presentation',
  ],
  images: [
    'application/vnd.google-apps.drawing',
    'application/vnd.google-apps.photo',
  ],
  videos: [
    'application/vnd.google-apps.video',
  ],
  audio: [
    'application/vnd.google-apps.audio',
  ],
  // The MIME type that mapped by `''`
  _unknown_: [
    'application/octet-stream',
  ],
};

// Set default error message timeout as 10 seconds.
const ERROR_MSG_TIMEOUT = 10000;

// Selectors for end-to-end testing
const E2E_SELECTORS = {
  J_ROW: 'j-row',
  J_CLOSE_BTN: 'j-close-btn',
  J_SELECT_BTN: 'j-select-btn',
  J_SAVE_BTN: 'j-save-btn',

  // TODO: add to iziToast-helper.js after DEV-3728 gets merged
  J_ERROR_DIALOG: 'j-error-dialog',
  J_SUCCESS_DIALOG: 'j-success-dialog',
  J_DIALOG_OK_BTN: 'j-dialog-ok-btn',
};

export {
  TYPE_ALIAS,
  MIME_TYPE_ALIAS,
  VIEW,
  FLAVOR,
  ERROR_MSG_TIMEOUT,
  E2E_SELECTORS,
};
export default {
  TYPE_ALIAS,
  MIME_TYPE_ALIAS,
  VIEW,
  FLAVOR,
  ERROR_MSG_TIMEOUT,
  E2E_SELECTORS,
};
