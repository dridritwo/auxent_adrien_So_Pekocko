const multer = require('multer');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    if (!Object.keys(MIME_TYPES).includes(file.mimetype)) {
      return callback(new Error("Unsupported media type"));
    } else {
      const name = file.originalname.split(" ").join("_");
      const extension = MIME_TYPES[file.mimetype];
      callback(null, name + Date.now() + "." + extension);
    }
  }
});

module.exports = multer({storage: storage}).single('image');

