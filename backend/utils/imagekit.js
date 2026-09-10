const ImageKit = require('imagekit');
const multer = require('multer');
require('dotenv').config();

const imagekit = new ImageKit({
  // Dùng giá trị dummy để backend vẫn khởi động được khi chưa cấu hình.
  // Hàm uploadBufferToImageKit sẽ báo lỗi rõ ràng nếu thiếu keys thật.
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'dummy_public_key',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'dummy_private_key',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/dummy',
});

function isImageKitConfigured() {
  return Boolean(
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT
  );
}

// Dùng memoryStorage rồi tự upload buffer lên ImageKit trong route handler.
// Lý do: ImageKit SDK không có multer-storage chính thức như Cloudinary,
// cách này giúp kiểm soát folder/transformation linh hoạt theo từng route.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (image/*).'), false);
    }
  },
});

function sanitizeFileName(originalName) {
  if (!originalName) return `image-${Date.now()}.jpg`;
  // Bỏ dấu, ký tự đặc biệt để ImageKit không lỗi
  return originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .slice(0, 100) || `image-${Date.now()}.jpg`;
}

/**
 * Upload buffer lên ImageKit.
 * @param {Buffer} buffer - req.file.buffer từ multer memoryStorage
 * @param {string} originalName - req.file.originalname
 * @param {string} folder - VD: '/smashteam', '/smashteam/avatars', '/smashteam/shop'
 * @returns {Promise<{url, fileId, filePath}>}
 */
async function uploadBufferToImageKit(buffer, originalName, folder = '/smashteam') {
  if (!isImageKitConfigured()) {
    throw new Error(
      'ImageKit chưa được cấu hình. Vui lòng set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT trong .env'
    );
  }
  if (!buffer) throw new Error('Không có dữ liệu ảnh để upload.');

  const fileName = sanitizeFileName(originalName);

  const result = await imagekit.upload({
    file: buffer, // SDK hỗ trợ Buffer trực tiếp
    fileName,
    folder,
    useUniqueFileName: true,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    filePath: result.filePath,
  };
}

function getFileNameFromImageKitUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1];
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

function isImageKitUrl(url) {
  return Boolean(url && url.includes('ik.imagekit.io'));
}

function isLegacyCloudinaryUrl(url) {
  return Boolean(url && url.includes('res.cloudinary.com'));
}

/**
 * Xóa ảnh ImageKit bằng URL.
 * ImageKit yêu cầu fileId để xóa, nên phải listFiles theo tên rồi xóa.
 * Trả về true nếu xóa thành công, false nếu bỏ qua/không tìm thấy.
 */
async function deleteFromImageKitByUrl(url) {
  if (!url || !isImageKitUrl(url)) return false;
  if (!isImageKitConfigured()) {
    console.warn('Bỏ qua xóa ImageKit vì chưa cấu hình keys.');
    return false;
  }
  try {
    const fileName = getFileNameFromImageKitUrl(url);
    if (!fileName) return false;

    // Tìm fileId theo tên file (tên đã được làm unique nên search chính xác)
    const files = await imagekit.listFiles({
      searchQuery: `name="${fileName}"`,
      limit: 5,
    });

    const matched =
      (Array.isArray(files) ? files : []).find((f) => f.url === url) ||
      (Array.isArray(files) ? files[0] : null);

    if (!matched || !matched.fileId) {
      console.warn(`Không tìm thấy fileId ImageKit cho URL: ${url}`);
      return false;
    }

    await imagekit.deleteFile(matched.fileId);
    console.log(`Đã xóa ảnh ImageKit: ${matched.fileId} (${fileName})`);
    return true;
  } catch (err) {
    console.error('Lỗi xóa ảnh ImageKit:', err?.message || err);
    return false;
  }
}

/**
 * Hàm xóa chung cho cả URL mới (ImageKit) và URL cũ (Cloudinary).
 * URL Cloudinary cũ vẫn hiển thị bình thường, chỉ bỏ qua xóa remote
 * để không phải giữ 2 tài khoản song song.
 */
async function deleteImageByUrl(url) {
  if (!url) return false;
  if (isImageKitUrl(url)) {
    return deleteFromImageKitByUrl(url);
  }
  if (isLegacyCloudinaryUrl(url)) {
    console.log('Bỏ qua xóa remote cho URL Cloudinary cũ (đã migrate sang ImageKit):', url);
    return false;
  }
  return false;
}

module.exports = {
  imagekit,
  upload,
  uploadBufferToImageKit,
  deleteFromImageKitByUrl,
  deleteImageByUrl,
  isImageKitUrl,
  isLegacyCloudinaryUrl,
  isImageKitConfigured,
};
