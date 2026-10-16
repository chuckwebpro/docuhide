(function () {
  const HERO_INTERVAL = 8000;
  const VIDEO_ID = 'Bhtfd6MS0BU';

  function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function setupNav() {
    const nav = document.getElementById('primary-nav');
    const toggles = document.querySelectorAll('[aria-controls="primary-nav"]');
    const shade = document.querySelector('.nav-shade');
    if (!nav || toggles.length === 0) return;

    const setOpen = (open) => {
      nav.setAttribute('data-collapsed', open ? 'false' : 'true');
      nav.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggles.forEach((el) => {
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    };

    const toggleFromClick = () => {
      const wasCollapsed = nav.getAttribute('data-collapsed') === 'true';
      setOpen(wasCollapsed);
    };

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleFromClick();
      });
    });

    shade?.addEventListener('click', () => setOpen(false));

    const syncDesktopNav = () => {
      if (window.matchMedia('(min-width: 1000px)').matches) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    syncDesktopNav();
    window.matchMedia('(min-width: 1000px)').addEventListener('change', syncDesktopNav);
  }

  function setupScrollHeader() {
    let lastScroll = window.scrollY;

    const sync = () => {
      const root = document.documentElement;
      if (window.scrollY === 0) {
        root.classList.remove('scrolling', 'scrolling-down', 'scrolling-up');
      } else {
        if (lastScroll > window.scrollY) {
          root.classList.add('scrolling-up');
          root.classList.remove('scrolling-down');
        } else if (lastScroll < window.scrollY) {
          root.classList.add('scrolling-down');
          root.classList.remove('scrolling-up');
        }
        root.classList.add('scrolling');
      }
      lastScroll = window.scrollY;
    };

    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  function setupInView() {
    const elements = document.querySelectorAll('[data-watching]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.setAttribute('data-watching', entry.isIntersecting ? 'in-view' : 'unseen');
        });
      },
      { threshold: 0.35, rootMargin: '0px' },
    );

    elements.forEach((el) => observer.observe(el));
  }

  function setupDialog() {
    const dialog = document.getElementById('popout-demo-form');
    if (!dialog) return;

    document.querySelectorAll('[data-demo-trigger]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        btn.setAttribute('aria-expanded', 'true');
      });
    });

    document.querySelectorAll('.dismiss-panel').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sel = btn.getAttribute('data-selector');
        if (sel === '#popout-demo-form' || sel === 'dialog') {
          dialog.close?.();
          dialog.removeAttribute('open');
        } else if (sel) {
          document.querySelector(sel)?.classList.remove('active');
        }
      });
    });

    dialog
      .querySelector('.btn[aria-controls="popout-demo-form"]')
      ?.addEventListener('click', () => {
        dialog.close?.();
        dialog.removeAttribute('open');
        document.querySelectorAll('[data-demo-trigger]').forEach((btn) => {
          btn.setAttribute('aria-expanded', 'false');
        });
      });

    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientY < rect.top ||
        event.clientY > rect.bottom ||
        event.clientX < rect.left ||
        event.clientX > rect.right
      ) {
        dialog.close?.();
      }
    });
  }

  function setupHeroFader() {
    document
      .querySelectorAll('.hero-section[data-type="two-column-text-and-big-image"]')
      .forEach((section) => {
        const heroImages = section.querySelector('.hero-images');
        if (!heroImages) return;

        const rotate = () => {
          const active = heroImages.querySelector('[data-active]');
          let next = active?.nextElementSibling;
          if (!next || next.tagName !== 'IMG') {
            next = heroImages.querySelector('img:first-child');
          }
          active?.removeAttribute('data-active');
          next?.setAttribute('data-active', '');
          setTimeout(rotate, HERO_INTERVAL);
        };
        setTimeout(rotate, HERO_INTERVAL);
      });
  }

  function setupVideo() {
    const panel = document.querySelector('.video-panel');
    const mount = document.getElementById('videoPlayer');
    if (!panel || !mount) return;

    const open = () => {
      panel.classList.add('active');
      if (!mount.querySelector('iframe')) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`;
        iframe.title = 'Docuhide Information Video';
        iframe.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        mount.appendChild(iframe);
      }
    };

    document.querySelectorAll('[data-video-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (btn.classList.contains('video-toggle') || btn.dataset.videoId) {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function setupDemoForm() {
    const form = document.getElementById('demo-form');
    const phone = document.getElementById('phone');
    const settings = document.getElementById('formSettingsElem');
    if (!form || !settings) return;

    const formatPhone = () => {
      if (phone) phone.value = formatPhoneNumber(phone.value);
    };
    phone?.addEventListener('keyup', formatPhone);
    phone?.addEventListener('change', formatPhone);

    const collectFormInfo = () => {
      const fields = form.querySelectorAll('[data-form-key]');
      const formInfo = {};
      fields.forEach((field) => {
        const key = field.getAttribute('data-form-key');
        const label = field.getAttribute('data-form-label');
        if (!key) return;
        if (field.type === 'checkbox') {
          formInfo[key] = { value: field.checked ? 'Yes' : 'No', label };
        } else {
          formInfo[key] = { value: field.value, label };
        }
      });
      return formInfo;
    };

    const submitDemoRequest = async () => {
      const formInfo = collectFormInfo();

      let recaptchaToken = '';
      if (window.grecaptcha) {
        const widget = document.getElementById('demo-form-recap');
        const id = widget?.getAttribute('data-widget-id');
        recaptchaToken = id
          ? window.grecaptcha.getResponse(Number(id))
          : window.grecaptcha.getResponse();
      }

      const res = await fetch('/api/schedule-demo.php', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formInfo, recaptchaToken }),
      });
      const reply = await res.json();
      if (reply.status === 200) {
        const msg = settings.getAttribute('data-response') || '';
        const first = formInfo.firstname?.value || '';
        const last = formInfo.lastname?.value || '';
        window.location.href = `/thank-you/?thankYouMessage=${encodeURIComponent(msg)}&contactName=${encodeURIComponent(`${first} ${last}`.trim())}`;
      } else {
        alert(reply.message || 'Something went wrong. Please try again.');
      }
    };

    window.verifyCallback = () => {
      submitDemoRequest();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const recapWrap = form.querySelector('.hidden-recaptcha');
      const submitBtn = form.querySelector('[type=submit]');

      if (!recapWrap?.classList.contains('active')) {
        recapWrap?.classList.add('active');
        if (recapWrap) recapWrap.style.height = '75px';
        if (submitBtn) submitBtn.style.display = 'none';
        if (typeof window.recapOnload === 'function') window.recapOnload();
        return;
      }

      submitDemoRequest();
    });
  }

  function setupRecaptchaA11y() {
    const patch = () => {
      document.querySelectorAll('textarea.g-recaptcha-response').forEach((field) => {
        field.setAttribute('aria-hidden', 'true');
        field.setAttribute('tabindex', '-1');
      });
      document.querySelectorAll('.g-recaptcha iframe').forEach((frame) => {
        if (!frame.title) frame.title = 'reCAPTCHA security verification';
      });
    };
    window.patchRecaptchaA11y = patch;
    patch();
    new MutationObserver(patch).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupScrollHeader();
    setupInView();
    setupNav();
    setupDialog();
    setupHeroFader();
    setupVideo();
    setupDemoForm();
    setupRecaptchaA11y();
  });
})();
