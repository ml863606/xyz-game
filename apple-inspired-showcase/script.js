const animatedItems = document.querySelectorAll(
  ".hero-copy, .phone-stage, .notebook-stage, .canvas-stage, .promo-copy, .watch-visual, .pods-visual, .home-visual, .card-stack"
);

const reveal = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        reveal.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

animatedItems.forEach((item) => reveal.observe(item));
