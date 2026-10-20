(() => {
  const head = document.getElementsByTagName('head')[0] || document.documentElement;
  let animationId = 1;
  const styleSheet = document.createElement('style');
  styleSheet.id = 'rose-magic-dust-styles';
  let cssRules = '';

  function createMagicDust(x1, x2, y1, y2, sizeRatio, fallingTime, animationDelay, node = 'main') {
    const targetNode = document.getElementById(node);
    if (!targetNode) return;

    const dust = document.createElement('span');
    const curAnimId = animationId++;
    const dx = +(x2 - x1).toFixed(1);
    const dy = +(y2 - y1).toFixed(1);
    const baseSize = Math.max(2, Math.round(3 * sizeRatio));

    // Đặt vị trí ban đầu cố định, không animate top/left/width/height để tránh reflow layout
    dust.style.left = `${x1}px`;
    dust.style.top = `${y1}px`;
    dust.style.width = `${baseSize}px`;
    dust.style.height = `${baseSize}px`;

    // 100% GPU-accelerated: translate3d, scale và opacity
    cssRules += `
      @keyframes blinkDust${curAnimId} {
        0% {
          transform: translate3d(0, 0, 0) scale(0.65);
          opacity: 0.35;
        }
        20% {
          transform: translate3d(${(dx * 0.2).toFixed(1)}px, ${(dy * 0.2).toFixed(1)}px, 0) scale(1.35);
          opacity: 0.85;
        }
        35% {
          transform: translate3d(${(dx * 0.35).toFixed(1)}px, ${(dy * 0.35).toFixed(1)}px, 0) scale(0.7);
          opacity: 0.5;
        }
        55% {
          transform: translate3d(${(dx * 0.55).toFixed(1)}px, ${(dy * 0.55).toFixed(1)}px, 0) scale(1.05);
          opacity: 0.75;
        }
        80% {
          transform: translate3d(${(dx * 0.8).toFixed(1)}px, ${(dy * 0.8).toFixed(1)}px, 0) scale(0.35);
          opacity: 0.3;
        }
        100% {
          transform: translate3d(${dx}px, ${dy}px, 0) scale(0.01);
          opacity: 0.05;
        }
      }
    `;

    dust.classList.add('dustDef');
    dust.style.animation = `blinkDust${curAnimId} ${fallingTime}s cubic-bezier(.71, .11, .68, .83) infinite ${animationDelay}s`;
    targetNode.appendChild(dust);
  }

  function initMagicDust() {
    const mainNode = document.getElementById('main');
    if (!mainNode) return;

    const isMobile = window.innerWidth <= 640 || ('ontouchstart' in window && window.innerWidth <= 820);

    const dustCoords = [
      [130, 132, 150, 152, .15, 2.5, .1, 'sub'],
      [65, 63, 300, 299, .5, 2, .2, 'sub'],
      [70, 70, 150, 150, .45, 2, .5],
      [75, 78, 160, 170, .6, 2, 1],
      [80, 82, 160, 180, .6, 1, .4],
      [85, 100, 160, 170, .5, 2, .5],
      [125, 110, 170, 180, .25, 3, 1.5],
      [90, 90, 115, 115, .4, 2, 2],
      [93, 95, 200, 200, .4, 3, 1.5],
      [100, 100, 145, 155, .45, 1, .5],
      [100, 90, 170, 230, .35, 2, .75],
      [100, 102, 115, 112, .35, 3, .25],
      [100, 95, 170, 200, .55, 1.5, .75],
      [100, 97, 150, 190, .7, 2, 1.5],
      [105, 100, 160, 180, .5, 1.5, .725],
      [125, 125, 180, 190, .25, 1, .725],
      [130, 130, 135, 135, .45, 3, 1.5],
      [135, 132, 170, 190, .25, 2.5, .75],
      [135, 132, 320, 315, .2, 5, .3, 'sub']
    ];

    // Trên điện thoại, chọn lọc ~11 hạt tiêu biểu để giảm 50% gánh nặng render mà vẫn lấp lánh nguyên vẹn
    const activeCoords = isMobile
      ? dustCoords.filter((_, idx) => idx % 2 === 0 || idx === 1 || idx === 13)
      : dustCoords;

    activeCoords.forEach((o) => createMagicDust(...o));

    // Gộp toàn bộ animation keyframes vào 1 thẻ style duy nhất, tránh layout thrashing
    styleSheet.textContent = cssRules;
    head.appendChild(styleSheet);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMagicDust);
  } else {
    initMagicDust();
  }
})();