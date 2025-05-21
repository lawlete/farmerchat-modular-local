// Arreglo para el reconocimiento de voz
class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.onResultCallback = null;
        this.onErrorCallback = null;
        this.onEndCallback = null;
        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.error('El reconocimiento de voz no está soportado en este navegador');
            return;
        }

        // Configuración
        this.recognition.lang = 'es-ES';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        // Eventos
        this.recognition.onresult = (event) => {
            const last = event.results.length - 1;
            this.transcript = event.results[last][0].transcript;
            console.log('Transcripción:', this.transcript);
            
            if (this.onResultCallback) {
                this.onResultCallback(this.transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            this.isListening = false;
            
            if (this.onErrorCallback) {
                this.onErrorCallback(event);
            }
        };

        this.recognition.onend = () => {
            console.log('Reconocimiento de voz finalizado');
            this.isListening = false;
            
            if (this.onEndCallback) {
                this.onEndCallback();
            }
        };
    }

    start() {
        if (!this.recognition) {
            console.error('El reconocimiento de voz no está inicializado');
            return;
        }

        if (this.isListening) {
            console.warn('Ya está escuchando');
            return;
        }

        // Reiniciar transcripción
        this.transcript = '';
        
        try {
            this.recognition.start();
            this.isListening = true;
            console.log('Comenzando a escuchar...');
        } catch (error) {
            console.error('Error al iniciar el reconocimiento de voz:', error);
        }
    }

    stop() {
        if (!this.recognition || !this.isListening) {
            return;
        }

        try {
            this.recognition.stop();
            this.isListening = false;
            console.log('Deteniendo reconocimiento de voz...');
        } catch (error) {
            console.error('Error al detener el reconocimiento de voz:', error);
        }
    }

    setOnResult(callback) {
        this.onResultCallback = callback;
    }

    setOnError(callback) {
        this.onErrorCallback = callback;
    }

    setOnEnd(callback) {
        this.onEndCallback = callback;
    }
}

// Integración con la aplicación principal
document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voice-btn');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Crear instancia del reconocimiento de voz
    const voiceRecognizer = new VoiceRecognition();
    
    // Establecer callbacks
    voiceRecognizer.setOnResult((transcript) => {
        userInput.value = transcript;
        
        // Esperar un momento antes de enviar para evitar problemas de sincronización
        setTimeout(() => {
            // Verificar si hay texto antes de enviar
            if (userInput.value.trim() !== '') {
                // Disparar evento de clic en el botón de enviar o la función que procesa el envío
                sendBtn.click();
            }
        }, 500);
    });
    
    voiceRecognizer.setOnError((event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        // Restaurar estado del botón
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0V3a2 2 0 0 1 2-2z"/>
                <path d="M12.5 10a.5.5 0 0 1 .5.5v1a4.5 4.5 0 0 1-4.5 4.5H7.5A4.5 4.5 0 0 1 3 11.5v-1a.5.5 0 0 1 1 0v1a3.5 3.5 0 0 0 3.5 3.5h1a3.5 3.5 0 0 0 3.5-3.5v-1a.5.5 0 0 1 .5-.5z"/>
            </svg>
        `;
    });
    
    voiceRecognizer.setOnEnd(() => {
        // Restaurar estado del botón
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0V3a2 2 0 0 1 2-2z"/>
                <path d="M12.5 10a.5.5 0 0 1 .5.5v1a4.5 4.5 0 0 1-4.5 4.5H7.5A4.5 4.5 0 0 1 3 11.5v-1a.5.5 0 0 1 1 0v1a3.5 3.5 0 0 0 3.5 3.5h1a3.5 3.5 0 0 0 3.5-3.5v-1a.5.5 0 0 1 .5-.5z"/>
            </svg>
        `;
    });
    
    // Manejar clic en el botón de voz
    voiceBtn.addEventListener('click', () => {
        if (!voiceRecognizer.isListening) {
            // Cambiar apariencia del botón
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                    <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                </svg>
            `;
            
            // Iniciar reconocimiento
            voiceRecognizer.start();
        } else {
            // Detener reconocimiento si ya está escuchando
            voiceRecognizer.stop();
        }
    });
});

// Añadir estilos necesarios para el botón
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .btn-voice.recording {
            background-color: #f44336;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
});
