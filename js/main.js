import { initThreeScene } from './three-scene.js';

/* ---------- footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- header solidifies once content scrolls under it ---------- */
const siteHeader = document.querySelector('[data-reveal-header]');
if (siteHeader) {
  const SCROLL_THRESHOLD = 24;
  const updateHeaderState = () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  };
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
}

/* ---------- mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');

if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!open));
    primaryNav.setAttribute('data-open', String(!open));
    document.body.style.overflow = !open ? 'hidden' : '';
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      primaryNav.setAttribute('data-open', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ---------- scroll reveal ---------- */
const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

if ('IntersectionObserver' in window) {
  const groups = new Map();
  revealEls.forEach((el) => {
    const parent = el.closest('section, header') || document.body;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach((els) => {
    els.forEach((el, i) => el.style.setProperty('--reveal-delay', `${Math.min(i * 70, 350)}ms`));
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- animated stat counters ---------- */
const counters = document.querySelectorAll('[data-counter]');
const animateCounter = (el) => {
  const target = parseInt(el.getAttribute('data-counter'), 10) || 0;
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = Math.round(target * eased).toString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

if (counters.length && 'IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => counterObserver.observe(el));
}

/* ---------- custom cursor (fine pointers only) ---------- */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.body.classList.add('has-custom-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener(
    'pointermove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    },
    { passive: true }
  );

  const trackHover = () => {
    ring.classList.add('is-active');
  };
  const untrackHover = () => {
    ring.classList.remove('is-active');
  };
  document.querySelectorAll('a, button, input, textarea').forEach((el) => {
    el.addEventListener('mouseenter', trackHover);
    el.addEventListener('mouseleave', untrackHover);
  });

  const animateRing = () => {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  };
  requestAnimationFrame(animateRing);
}

/* ---------- 3D scene ---------- */
initThreeScene();

/* ---------- contact form: client-side validation, sanitization, anti-bot ---------- */
const form = document.getElementById('contactForm');

if (form) {
  const formTsField = document.getElementById('form_ts');
  formTsField.value = String(Date.now());

  const fields = {
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    message: document.getElementById('message'),
  };
  const errors = {
    name: document.getElementById('name-error'),
    email: document.getElementById('email-error'),
    message: document.getElementById('message-error'),
  };
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('contactSubmit');

  const NAME_RE = /^[\p{L}\p{M}\s'.-]{2,100}$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Trim whitespace; format/length are enforced per-field below. Never trust raw input.
  const sanitize = (value) => value.trim();

  const validators = {
    name: (value) => (NAME_RE.test(value) ? '' : 'Informe seu nome (2–100 caracteres).'),
    email: (value) => (EMAIL_RE.test(value) && value.length <= 254 ? '' : 'Informe um e-mail válido.'),
    message: (value) =>
      value.length >= 10 && value.length <= 2000 ? '' : 'Conte um pouco mais sobre o projeto (10–2000 caracteres).',
  };

  const validateField = (key) => {
    const raw = sanitize(fields[key].value);
    fields[key].value = raw;
    const message = validators[key](raw);
    errors[key].textContent = message;
    fields[key].setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  };

  Object.keys(fields).forEach((key) => {
    fields[key].addEventListener('blur', () => validateField(key));
  });

  let lastSubmitAt = 0;
  const SUBMIT_COOLDOWN_MS = 10000;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = '';
    statusEl.removeAttribute('data-state');

    const honeypot = document.getElementById('company').value;
    if (honeypot) {
      // Silently drop suspected bot submissions without revealing the trap.
      statusEl.textContent = 'Mensagem enviada. Obrigado!';
      statusEl.setAttribute('data-state', 'ok');
      form.reset();
      return;
    }

    const elapsed = Date.now() - Number(formTsField.value || 0);
    if (elapsed < 1500) {
      statusEl.textContent = 'Aguarde um instante e tente novamente.';
      statusEl.setAttribute('data-state', 'err');
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
      statusEl.textContent = 'Você já enviou uma mensagem. Aguarde alguns segundos.';
      statusEl.setAttribute('data-state', 'err');
      return;
    }

    const validKeys = Object.keys(fields).filter((key) => validateField(key));
    if (validKeys.length !== Object.keys(fields).length) {
      statusEl.textContent = 'Corrija os campos destacados.';
      statusEl.setAttribute('data-state', 'err');
      return;
    }

    const payload = {
      name: fields.name.value,
      email: fields.email.value,
      message: fields.message.value,
    };

    submitBtn.disabled = true;
    statusEl.textContent = 'Enviando...';

    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        statusEl.textContent = 'Mensagem enviada. Obrigado! Retorno em até dois dias úteis.';
        statusEl.setAttribute('data-state', 'ok');
        form.reset();
        formTsField.value = String(Date.now());
        lastSubmitAt = now;
      } else if (response.status === 429) {
        statusEl.textContent = 'Muitas tentativas. Tente novamente em alguns minutos.';
        statusEl.setAttribute('data-state', 'err');
      } else {
        statusEl.textContent = 'Não foi possível enviar agora. Tente novamente ou use o e-mail direto.';
        statusEl.setAttribute('data-state', 'err');
      }
    } catch (err) {
      statusEl.textContent = 'Sem conexão com o servidor. Tente novamente ou use o e-mail direto.';
      statusEl.setAttribute('data-state', 'err');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
