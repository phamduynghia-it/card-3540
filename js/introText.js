/**
 * ============================================================================
 * HIỆU ỨNG CHỮ CHẠY INTRO BẰNG HẠT 3D (THREE.JS WEBGL PARTICLE TEXT)
 * LoveVerse - Chúc mừng 20/10
 * Dựa trên cấu trúc chuẩn từ docs/INTRO_TEXT_GUIDE.md
 * ============================================================================
 */

class IntroTextAnimation {
  constructor(options = {}) {
    this.canvas = document.getElementById(options.canvasId || 'intro-canvas');
    this.container = document.getElementById(options.containerId || 'intro-text-screen');

    // Danh sách các câu chữ hiển thị lần lượt
    this.messages = options.messages || [
      'Chúc mừng ngày quốc tế phụ nữ Việt Nam 20/10'
    ];

    this.displayTime = options.displayTime || 3600; // Thời gian mỗi câu (ms)
    this.onComplete = options.onComplete || null;

    // Cấu hình hạt Three.js tối ưu cho di động & máy tính
    const isMobile = window.innerWidth < 768;
    this.config = {
      isMobile,
      particleCount: isMobile ? 50000 : 80000,
      particleSize: isMobile ? 0.16 : 0.18,
      gatherSpeed: isMobile ? 0.08 : 0.05,
      explosionPower: 130,
      depthThickness: isMobile ? 1.0 : 1.5,
      colorStart: options.colorStart || '#d81159', // Hồng ruby đậm đà sắc nét
      colorEnd: options.colorEnd || '#ff1493'      // Hồng thắm rực rỡ, đậm đà
    };

    this.currentIndex = 0;
    this.lastChangeTime = 0;
    this.isStarted = false;
    this.isFinished = false;
    this.isExploding = false;
    this.explodeStartTime = 0;
    this.rafId = null;

    this.initThree();
  }

  /* -------------------------------------------------------------
     1. KHỞI TẠO THREE.JS VÀ HỆ THỐNG HẠT 3D
     ------------------------------------------------------------- */
  initThree() {
    if (!this.canvas) return;

    if (typeof THREE === 'undefined') {
      console.error('Three.js chưa được tải!');
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 25, 65);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false, // Tối ưu tối đa hiệu năng GPU, loại bỏ 4x MSAA overhead
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 1.1. Bụi sao lung linh nền (Background Stars)
    this.createBackgroundStars();

    // 1.2. Tạo bộ đệm hạt chữ (Particle Text System)
    const count = this.config.particleCount;
    this.currentPos = new Float32Array(count * 3);
    this.targetPos = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 20 + 40 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.currentPos[3 * i] = r * Math.sin(phi) * Math.cos(theta);
      this.currentPos[3 * i + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.currentPos[3 * i + 2] = r * Math.cos(phi);

      this.targetPos[3 * i] = this.currentPos[3 * i];
      this.targetPos[3 * i + 1] = this.currentPos[3 * i + 1];
      this.targetPos[3 * i + 2] = this.currentPos[3 * i + 2];

      this.colors[3 * i] = 0.92;
      this.colors[3 * i + 1] = 0.12;
      this.colors[3 * i + 2] = 0.45;
    }

    this.textGeometry = new THREE.BufferGeometry();
    this.textGeometry.setAttribute('position', new THREE.BufferAttribute(this.currentPos, 3));
    this.textGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.textMaterial = new THREE.PointsMaterial({
      size: this.config.particleSize,
      map: this.createSparkleTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.textPoints = new THREE.Points(this.textGeometry, this.textMaterial);
    this.textPoints.position.set(0, 8, 0);
    this.scene.add(this.textPoints);

    // Xử lý resize cửa sổ / xoay màn hình điện thoại
    this.handleResize = () => {
      if (!this.camera || !this.renderer) return;
      this.config.isMobile = window.innerWidth < 768;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Cập nhật lại vị trí các hạt theo kích thước màn hình mới
      if (this.isStarted && this.messages[this.currentIndex]) {
        this.sampleTextToParticles(this.messages[this.currentIndex]);
      }
    };
    window.addEventListener('resize', this.handleResize);

    // Bắt đầu render loop
    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  /* Tạo texture đốm sáng tròn mờ lấp lánh tông hồng đậm đà, sắc nét trên nền trời */
  createSparkleTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 235, 245, 1)');       // Điểm sáng trung tâm
    grad.addColorStop(0.2, 'rgba(255, 20, 147, 0.98)');   // Hồng thắm đậm đà bão hòa cao
    grad.addColorStop(0.5, 'rgba(216, 17, 89, 0.88)');    // Hồng ruby sâu lắng, rõ nét
    grad.addColorStop(0.8, 'rgba(160, 10, 70, 0.35)');    // Hào quang hồng sẫm
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* Bụi sao nền trôi nhẹ trong không gian 3D */
  createBackgroundStars() {
    const starCount = 3000;
    const positions = [];
    for (let i = 0; i < starCount; i++) {
      positions.push(
        1500 * (Math.random() - 0.5),
        1500 * (Math.random() - 0.5),
        1500 * (Math.random() - 0.5)
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.65,
      transparent: true,
      opacity: 0.55
    });
    this.backgroundStars = new THREE.Points(geom, mat);
    this.scene.add(this.backgroundStars);
  }

  /* -------------------------------------------------------------
     2. SAMPLING CHỮ TỪ CANVAS 2D THÀNH ĐIỂM 3D
     ------------------------------------------------------------- */
  sampleTextToParticles(textStr) {
    const isMob = this.config.isMobile;
    const cWidth = isMob ? 600 : 1200;
    const cHeight = 500;
    let fontSize = isMob ? 115 : 155;

    const canvas = document.createElement('canvas');
    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d');
    const fontFam = '"Mali", "Pacifico", "Dancing Script", cursive, sans-serif';
    const letterSpacing = isMob ? 2 : 4;
    const maxLineWidth = 0.85 * cWidth;

    // Hàm bẻ dòng tự động cho các câu dài
    const wrapText = (sz) => {
      ctx.font = `${sz}px ${fontFam}`;
      const lines = [];
      const words = textStr.split(' ');
      let cur = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const test = cur + ' ' + words[i];
        if (ctx.measureText(test).width + test.length * letterSpacing > maxLineWidth) {
          lines.push(cur);
          cur = words[i];
        } else {
          cur = test;
        }
      }
      lines.push(cur);
      return lines;
    };

    let lines = wrapText(fontSize);
    // Tự động thu nhỏ nếu chữ quá nhiều dòng
    for (let i = 0; i < 5; i++) {
      if (lines.length * (1.6 * fontSize) > 420) {
        fontSize = Math.floor(fontSize * 0.85);
        lines = wrapText(fontSize);
      } else {
        break;
      }
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cWidth, cHeight);
    ctx.font = `${fontSize}px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const lineHeight = 1.6 * fontSize;
    const startY = 250 - ((lines.length - 1) * lineHeight) / 2;

    // Vẽ nét viền dày và tô ruột màu trắng để hạt phủ dày dặn, đậm nét chữ
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = isMob ? 7 : 9.5;
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      this.drawSpacedText(ctx, lines[i], cWidth / 2, lineY, letterSpacing, 'stroke');
      this.drawSpacedText(ctx, lines[i], cWidth / 2, lineY, letterSpacing, 'fill');
    }

    // Quét pixel lấy các điểm có độ sáng cao
    const imgData = ctx.getImageData(0, 0, cWidth, cHeight).data;
    const points = [];
    for (let y = 0; y < cHeight; y++) {
      for (let x = 0; x < cWidth; x++) {
        const brightness = imgData[4 * (y * cWidth + x)];
        if (brightness > 100) {
          points.push({ x, y, b: brightness });
        }
      }
    }

    // Tính toán tỉ lệ 3D phù hợp khung hình (không bị méo trên điện thoại dọc)
    const aspect = window.innerWidth / window.innerHeight;
    const camDist = 69.64;
    const vFOV = (75 * Math.PI) / 180;
    const visibleHeight = 2 * camDist * Math.tan(vFOV / 2);
    const visibleWidth = visibleHeight * aspect;

    const textScale = aspect < 1
      ? Math.min(0.085, (visibleWidth * 0.80) / (0.85 * cWidth))
      : 0.105;

    const offsetX = (-cWidth * textScale) / 2;
    const colorStart = new THREE.Color(this.config.colorStart);
    const colorEnd = new THREE.Color(this.config.colorEnd);
    const colorAttr = this.textGeometry.attributes.color;

    // Gán tọa độ mục tiêu mới cho toàn bộ hạt
    for (let i = 0; i < this.config.particleCount; i++) {
      if (points.length > 0) {
        const pt = points[Math.floor(Math.random() * points.length)];
        this.targetPos[3 * i] = pt.x * textScale + offsetX;
        this.targetPos[3 * i + 1] = -pt.y * textScale + (cHeight * textScale) / 2;
        this.targetPos[3 * i + 2] = (Math.random() - 0.5) * this.config.depthThickness;

        const normB = pt.b / 255;
        const col = colorStart.clone().lerp(colorEnd, 1 - normB);
        colorAttr.setXYZ(i, col.r, col.g, col.b);
      }
    }
    colorAttr.needsUpdate = true;
  }

  drawSpacedText(ctx, text, centerX, centerY, spacing, type) {
    if (spacing <= 0) {
      if (type === 'fill') ctx.fillText(text, centerX, centerY);
      else ctx.strokeText(text, centerX, centerY);
      return;
    }
    const chars = Array.from(text);
    const totalW = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, -spacing);
    let curX = centerX - totalW / 2;
    for (const ch of chars) {
      const w = ctx.measureText(ch).width;
      if (type === 'fill') ctx.fillText(ch, curX + w / 2, centerY);
      else ctx.strokeText(ch, curX + w / 2, centerY);
      curX += w + spacing;
    }
  }

  /* -------------------------------------------------------------
     3. BẮT ĐẦU HIỆU ỨNG CHỮ
     ------------------------------------------------------------- */
  start() {
    this.isStarted = true;
    this.currentIndex = 0;
    this.lastChangeTime = Date.now();

    if (typeof this.handleResize === 'function') {
      this.handleResize();
    }

    // Nếu chưa sample câu đầu thì sample ngay, nếu đã pre-warm rồi thì dùng ngay buffer sẵn có
    if (!this.hasSampledFirst) {
      this.sampleTextToParticles(this.messages[0]);
      this.hasSampledFirst = true;
    }

    // Khi phông chữ Google tải xong, cập nhật lại nét chữ mượt mà nếu vẫn ở câu đầu
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (this.isStarted && this.currentIndex === 0) {
          this.sampleTextToParticles(this.messages[0]);
        }
      }).catch(() => {});
    }
  }

  /* -------------------------------------------------------------
     4. RENDER LOOP & HIỆU ỨNG TỤ / NỔ CHUYỂN CÂU
     ------------------------------------------------------------- */
  animate() {
    this.rafId = requestAnimationFrame(this.animate);
    const now = Date.now();
    const timeSec = 0.001 * now;

    // Xoay nhẹ bụi sao nền
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y = timeSec * 0.02;
    }

    if (this.isStarted && !this.isFinished) {
      // Căn thẳng chữ chính diện camera mắt nhìn (Billboard)
      this.textPoints.quaternion.copy(this.camera.quaternion);

      // Hiệu ứng thở nhẹ nhàng theo hình sin
      const breathY = 0.45 * Math.sin(1.2 * timeSec);
      this.textPoints.position.y += (breathY - this.textPoints.position.y) * 0.08;

      // Tụ hạt (Gather lerp)
      const speed = this.isExploding ? 0.012 : this.config.gatherSpeed;
      const count = this.config.particleCount;

      for (let i = 0; i < count; i++) {
        const idx = 3 * i;
        this.currentPos[idx]     += (this.targetPos[idx]     - this.currentPos[idx])     * speed;
        this.currentPos[idx + 1] += (this.targetPos[idx + 1] - this.currentPos[idx + 1]) * speed;
        this.currentPos[idx + 2] += (this.targetPos[idx + 2] - this.currentPos[idx + 2]) * speed;
      }
      this.textGeometry.attributes.position.needsUpdate = true;

      // Xử lý nổ tan biến cuối cùng khi hoàn tất tất cả câu
      if (this.isExploding) {
        const elapsed = now - this.explodeStartTime;
        if (elapsed > 100) {
          const fade = Math.min(1, (elapsed - 100) / 450);
          this.textMaterial.opacity = 1 - fade;
        }
        if (elapsed > 600) {
          this.isFinished = true;
          this.textPoints.visible = false;
          // Kích hoạt callback và dispatch event kết thúc
          if (typeof this.onComplete === 'function') {
            this.onComplete();
          }
          window.dispatchEvent(new CustomEvent('textMessagesComplete'));
        }
      }

      // Tự động chuyển câu sau mỗi displayTime
      if (!this.isExploding && now - this.lastChangeTime > this.displayTime) {
        if (this.currentIndex < this.messages.length - 1) {
          this.currentIndex++;
          // Nổ hạt chuyển câu
          const pwr = this.config.explosionPower;
          for (let i = 0; i < count; i++) {
            this.currentPos[3 * i]     += (Math.random() - 0.5) * pwr;
            this.currentPos[3 * i + 1] += (Math.random() - 0.5) * pwr;
            this.currentPos[3 * i + 2] += (Math.random() - 0.5) * pwr;
          }
          this.sampleTextToParticles(this.messages[this.currentIndex]);
          this.lastChangeTime = now;
        } else {
          // Đã hiển thị xong toàn bộ câu (kể cả câu cuối "Lan Anh") -> Nổ bung phân rã toàn không gian
          this.isExploding = true;
          this.explodeStartTime = now;
          for (let i = 0; i < count; i++) {
            this.targetPos[3 * i]     = 420 * (Math.random() - 0.5);
            this.targetPos[3 * i + 1] = 420 * (Math.random() - 0.5);
            this.targetPos[3 * i + 2] = 420 * (Math.random() - 0.5);
          }
        }
      }
    } else if (this.isFinished) {
      // Khi đã dừng: duy trì render nếu cần
      if (this.textPoints && this.textPoints.visible) {
        this.textPoints.quaternion.copy(this.camera.quaternion);
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setMessages(newMessages) {
    if (!Array.isArray(newMessages) || !newMessages.length) return;
    const filtered = newMessages.filter(m => typeof m === 'string' && m.trim().length > 0);
    if (!filtered.length) return;
    this.messages = filtered;

    // Nếu chưa chạy hoặc đang ở câu đầu thì pre-sample ngay câu mới vào buffer
    if (!this.isStarted || this.currentIndex === 0) {
      this.currentIndex = 0;
      this.sampleTextToParticles(this.messages[0]);
      this.hasSampledFirst = true;
    }
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    if (this.textGeometry) this.textGeometry.dispose();
    if (this.textMaterial) this.textMaterial.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}

// Khởi tạo tiện ích toàn cục tương thích với LoveVerse (Hỗ trợ pre-warm & nạp dữ liệu động từ Server)
function initIntroText(onComplete, options = {}) {
  const serverMessages = options.messages ||
    window.LOVE_VERSE_DATA?.introMessages ||
    window.LOVE_VERSE_CONFIG?.introMessages;

  if (window.introTextInstance) {
    if (onComplete) window.introTextInstance.onComplete = onComplete;
    if (serverMessages) {
      window.introTextInstance.setMessages(serverMessages);
    }
    if (options.autoStart !== false) {
      window.introTextInstance.start();
    }
    return window.introTextInstance;
  }

  const defaultMessages = [
    'Chúc bé iu',
    'Ngày phụ nữ Việt Nam 20/10',
    'Luôn xinh đẹp, hạnh phúc',
    'Yêu em nhiều'
  ];

  const messagesToUse = (Array.isArray(serverMessages) && serverMessages.length)
    ? serverMessages
    : defaultMessages;

  const intro = new IntroTextAnimation({
    canvasId: 'intro-canvas',
    containerId: 'intro-text-screen',
    displayTime: options.displayTime || 3600,
    colorStart: options.colorStart || '#d81159', // Hồng ruby đậm đà sắc nét
    colorEnd: options.colorEnd || '#ff1493',     // Hồng thắm rực rỡ
    messages: messagesToUse,
    onComplete: onComplete
  });

  // Pre-sample câu đầu tiên sẵn vào bộ đệm để sẵn sàng hiển thị với độ trễ 0ms
  intro.sampleTextToParticles(intro.messages[0]);
  intro.hasSampledFirst = true;

  if (options.autoStart !== false) {
    intro.start();
  }

  window.introTextInstance = intro;
  return intro;
}

// Hàm toàn cục cho Server/API nạp danh sách câu intro bất kỳ lúc nào
function setIntroMessages(newMessages) {
  if (!Array.isArray(newMessages)) return;
  window.LOVE_VERSE_DATA = window.LOVE_VERSE_DATA || {};
  window.LOVE_VERSE_DATA.introMessages = newMessages;

  if (window.introTextInstance) {
    window.introTextInstance.setMessages(newMessages);
  }
}

if (typeof window !== 'undefined') {
  window.IntroTextAnimation = IntroTextAnimation;
  window.initIntroText = initIntroText;
  window.setIntroMessages = setIntroMessages;
}