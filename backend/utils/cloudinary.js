const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Thư mục lưu trữ file cục bộ khi không có cấu hình Cloudinary
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Bộ lưu trữ đĩa cục bộ (Local Disk Storage)
const localDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

// Kiểm tra loại file hình ảnh hợp lệ
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP, GIF).'));
  }
};

// Wrapper để đồng nhất thuộc tính req.file.path thành HTTP URL khi dùng Local Storage
function wrapMulter(multerInstance) {
  return {
    single: (fieldName) => {
      const multerSingle = multerInstance.single(fieldName);
      return (req, res, next) => {
        multerSingle(req, res, (err) => {
          if (err) {
            console.error('[Multer Error]:', err);
            return res.status(400).json({ error: err.message || 'Lỗi tải tệp lên' });
          }
          if (req.file && !isCloudinaryConfigured) {
            const protocol = req.protocol || 'http';
            const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
            const baseUrl = process.env.SERVER_URL || `${protocol}://${host}`;
            req.file.localDiskPath = req.file.path;
            req.file.path = `${baseUrl}/uploads/${req.file.filename}`;
          }
          next();
        });
      };
    },
    array: (fieldName, maxCount) => multerInstance.array(fieldName, maxCount),
    fields: (fields) => multerInstance.fields(fields)
  };
}

let upload;
let uploadAvatar;

if (isCloudinaryConfigured) {
  const mediaStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'smashteam',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
    }
  });

  const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'avatars',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
    }
  });

  upload = wrapMulter(multer({ storage: mediaStorage, fileFilter: imageFileFilter }));
  uploadAvatar = wrapMulter(multer({ storage: avatarStorage, fileFilter: imageFileFilter }));
} else {
  console.log('[Storage] Chế độ lưu trữ: Local Disk Storage tại /backend/uploads');
  const localMulter = multer({ 
    storage: localDiskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFileFilter 
  });
  upload = wrapMulter(localMulter);
  uploadAvatar = wrapMulter(localMulter);
}

module.exports = { cloudinary, upload, uploadAvatar, uploadsDir, isCloudinaryConfigured };
