document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('ask-mic');
    const statusEl = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const btnText = document.getElementById('btn-text');
    const micIcon = document.getElementById('mic-icon');

    btn.onclick = async () => {
        // UI Loading state
        btn.disabled = true;
        spinner.style.display = "block";
        btnText.innerText = "Demande en cours...";

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Immediately stop tracks since we just needed the permission grant
            stream.getTracks().forEach(t => t.stop());

            // UI Success state
            spinner.style.display = "none";
            btnText.innerText = "Accès Accordé";

            // Freeze the pulsing ring and make it green
            micIcon.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))';
            micIcon.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            const svg = micIcon.querySelector('svg');
            svg.style.color = '#10b981'; // Success green
            const styleSheet = document.createElement("style");
            styleSheet.innerText = ".icon-container::after { animation: none !important; border-color: #10b981 !important; transform: scale(1.1); opacity: 0.5; }";
            document.head.appendChild(styleSheet);

            statusEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <span class="success">Parfait ! Fermeture en cours...</span>
            `;
            statusEl.className = "visible";

            // Send message to background script or close window
            setTimeout(() => window.close(), 1800);

        } catch (err) {
            console.error("Microphone error:", err);
            // UI Error state
            spinner.style.display = "none";
            btnText.innerText = "Réessayer";
            btn.disabled = false;

            let errorMsg = "Erreur inconnue.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMsg = "Accès refusé. Veuillez vérifier les paramètres de ce site en haut de votre navigateur.";
            } else if (err.name === "NotFoundError") {
                errorMsg = "Aucun microphone détecté sur cet appareil.";
            }

            statusEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="error"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span class="error">${errorMsg}</span>
            `;
            statusEl.className = "visible";
        }
    };
});
