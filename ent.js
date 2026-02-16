document.addEventListener("DOMContentLoaded", () => {
    const wordBox = document.getElementById('word-box');
    const bar = document.getElementById('loadBar');
    const wrapper = document.getElementById('entrance-wrapper');
    const word = "CAMPUSBOOK";
    const duration = 3000;

    // Generate Letters
    word.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = char;
        span.style.animationDelay = (i * 0.08) + "s";
        wordBox.appendChild(span);
    });

    const start = Date.now();
    const update = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min((elapsed / duration) * 100, 100);
        bar.style.width = progress + "%";

        if (elapsed < duration) {
            requestAnimationFrame(update);
        } else {
            wrapper.classList.add('is-done');
            setTimeout(() => wrapper.remove(), 800);
        }
    };

    update();
});