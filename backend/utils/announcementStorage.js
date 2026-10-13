const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Danh sách định dạng an toàn
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip',
  '.jpg', '.jpeg', '.png', '.webp'
];

const ALLOWED_ATTACHMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const DANGEROUS_EXTENSIONS = [
  '.svg', '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.mjs',
  '.html', '.htm', '.jsp', '.py', '.jar', '.vbs', '.msi', '.ps1', '.cgi'
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const safeFieldName = file.fieldname === 'image' ? 'announcement-img' : 'announcement-doc';
    cb(null, `${safeFieldName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Chặn tuyệt đối các file có đuôi nguy hiểm (kể cả SVG)
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Tệp có định dạng ${ext} không được phép tải lên vì lý do bảo mật.`));
  }

  if (file.fieldname === 'image') {
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext) || !ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error('Ảnh chỉ chấp nhận định dạng JPG, JPEG, PNG, WEBP. Không hỗ trợ SVG.'));
    }
    return cb(null, true);
  }

  if (file.fieldname === 'attachment') {
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Tài liệu không hỗ trợ định dạng ${ext}. Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX, ZIP, ảnh.`));
    }
    return cb(null, true);
  }

  return cb(new Error(`Trường tải lên không xác định: ${file.fieldname}`));
};

const uploadMulter = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // Giới hạn tối đa 15MB chung cho multer
  },
  fileFilter: fileFilter
});

// Middleware xử lý upload đa tệp (image & attachment) kèm kiểm tra giới hạn dung lượng riêng biệt
const handleAnnouncementUploads = (req, res, next) => {
  const uploadFields = uploadMulter.fields([
    { name: 'image', maxCount: 1 },
    { name: 'attachment', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép (15MB).' });
      }
      return res.status(400).json({ error: err.message || 'Lỗi xử lý tệp tải lên.' });
    }

    // Kiểm tra riêng dung lượng ảnh <= 15MB
    if (req.files && req.files.image && req.files.image[0]) {
      const imgFile = req.files.image[0];
      if (imgFile.size > 15 * 1024 * 1024) {
        safeDeleteLocalUpload(imgFile.filename);
        return res.status(400).json({ error: 'Ảnh đính kèm vượt quá dung lượng tối đa cho phép (15MB).' });
      }
    }

    // Kiểm tra riêng dung lượng attachment <= 15MB
    if (req.files && req.files.attachment && req.files.attachment[0]) {
      const attFile = req.files.attachment[0];
      if (attFile.size > 15 * 1024 * 1024) {
        safeDeleteLocalUpload(attFile.filename);
        return res.status(400).json({ error: 'Tài liệu đính kèm vượt quá dung lượng tối đa cho phép (15MB).' });
      }
    }

    next();
  });
};

function getPublicFileUrl(req, filename) {
  if (!filename) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
  const baseUrl = process.env.SERVER_URL || `${protocol}://${host}`;
  return `${baseUrl}/uploads/${filename}`;
}

function safeDeleteLocalUpload(fileUrlOrName) {
  if (!fileUrlOrName) return;
  try {
    let filename = fileUrlOrName;
    if (fileUrlOrName.includes('/uploads/')) {
      filename = fileUrlOrName.split('/uploads/')[1];
    }
    filename = path.basename(filename);
    const fullPath = path.join(uploadsDir, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn('[Storage] Error deleting local file:', err.message);
  }
}

module.exports = {
  handleAnnouncementUploads,
  getPublicFileUrl,
  safeDeleteLocalUpload,
  uploadsDir
};
