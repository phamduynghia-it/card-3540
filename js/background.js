/**
 * Living Twilight Meadow Effects Controller
 * Tự động tạo hạt thông minh, tính toán tọa độ theo tỉ lệ màn hình,
 * và tự động co giãn tối ưu hiệu năng trên Điện thoại, Tablet, PC.
 * Kiến trúc chuẩn từ BACKGROUND_GUIDE.md
 */
(() => {
  let resizeTimeout = null;

  function renderResponsiveEffects() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isPortrait = h > w;
    const isMobile = w <= 600;
    const isTablet = w > 600 && w <= 1024;

    // Số lượng hạt điều chỉnh thông minh theo loại thiết bị (đảm bảo 60fps trên mobile)
    const starCount = isMobile ? 32 : (isTablet ? 45 : 60);
    const fireflyCount = isMobile ? 16 : (isTablet ? 22 : 30);
    const shootCount = isMobile ? 5 : (isTablet ? 6 : 8);

    // 1. Hàm tạo Sao Băng (Shooting Stars)
    function renderShootingStars(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (typeof container.replaceChildren === 'function') {
        container.replaceChildren();
      } else {
        container.innerHTML = '';
      }

      for (let i = 0; i < shootCount; i++) {
        const star = document.createElement("div");
        star.className = "shooting-star";
        star.style.left = `${20 + Math.random() * 65}%`;
        star.style.top = `${2 + Math.random() * (isPortrait ? 22 : 26)}%`;
        star.style.animationDelay = `${(i * 1.6 + Math.random() * 2).toFixed(2)}s`;

        const size = (isMobile ? (2.5 + Math.random() * 1.5) : (3 + Math.random() * 2.5)).toFixed(1);
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        container.appendChild(star);
      }
    }

    // 2. Hàm tạo Đom Đóm Phát Sáng (Fireflies - Tụ quanh thảm cỏ phía dưới)
    function renderFireflies(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (typeof container.replaceChildren === 'function') {
        container.replaceChildren();
      } else {
        container.innerHTML = '';
      }

      const grassTopMin = isPortrait ? 86 : 85;
      const grassHeightRange = isPortrait ? 10 : 11;

      for (let i = 0; i < fireflyCount; i++) {
        const firefly = document.createElement("div");
        firefly.className = "firefly";
        firefly.style.left = `${Math.random() * 94 + 3}%`;
        firefly.style.top = `${grassTopMin + Math.random() * grassHeightRange}%`;

        const size = (isMobile ? (2.5 + Math.random() * 2.5) : (3 + Math.random() * 3.5)).toFixed(1);
        firefly.style.width = `${size}px`;
        firefly.style.height = `${size}px`;

        const floatDuration = 5 + Math.random() * 4;
        const pulseDuration = 1.6 + Math.random() * 2.2;
        const delay = Math.random() * 6;

        firefly.style.animationDuration = `${floatDuration}s, ${pulseDuration}s`;
        firefly.style.animationDelay = `${delay}s, ${delay}s`;
        container.appendChild(firefly);
      }
    }

    // 3. Hàm tạo Ngôi Sao Lấp Lánh Bầu Trời (Sky Stars - Nằm ở nửa trên)
    function renderSkyStars(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (typeof container.replaceChildren === 'function') {
        container.replaceChildren();
      } else {
        container.innerHTML = '';
      }

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        const isCross = i % 4 === 0; // Cứ mỗi 4 sao tròn thì có 1 sao chữ thập
        star.className = `sky-star ${isCross ? 'cross' : ''}`;
        star.style.left = `${Math.random() * 96 + 2}%`;
        star.style.top = `${(Math.random() * 94 + 2).toFixed(1)}%`;

        const size = isCross 
          ? (isMobile ? (6 + Math.random() * 2.5) : (7 + Math.random() * 3.5))
          : (isMobile ? (1.8 + Math.random() * 1.8) : (2 + Math.random() * 2.5));
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        star.style.animationDuration = `${1.8 + Math.random() * 2.5}s`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        container.appendChild(star);
      }
    }

    // Khởi tạo vào các container tương ứng (Màn chính, lá thư, bộ ảnh)
    renderShootingStars("shooting-stars");
    renderShootingStars("letter-shooting-stars");
    renderShootingStars("image-shooting-stars");
    renderFireflies("fireflies");
    renderFireflies("letter-fireflies");
    renderFireflies("image-fireflies");
    renderSkyStars("sky-stars");
    renderSkyStars("letter-sky-stars");
    renderSkyStars("image-sky-stars");
  }

  // Khởi chạy khi tài liệu đã sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderResponsiveEffects);
  } else {
    renderResponsiveEffects();
  }

  // Tự động căn chỉnh mượt mà khi đổi kích thước hoặc xoay màn hình điện thoại
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(renderResponsiveEffects, 200);
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(renderResponsiveEffects, 300);
  });

  window.renderBackgroundEffects = renderResponsiveEffects;
})();
