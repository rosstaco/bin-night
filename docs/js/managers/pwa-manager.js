/**
 * PWA Manager - Handles PWA installation functionality
 */
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
  }

  /**
   * Set up PWA install functionality
   */
  setupPWAInstall() {
    // Check if device is mobile (iPhone or Android)
    const isMobile = this.isMobileDevice();
    const installBtn = document.getElementById("installBtn");
    
    if (!isMobile || !installBtn) {
      return; // Only show on mobile devices
    }

    // Listen for beforeinstallprompt event (Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 PWA install prompt available');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.showInstallButton();
    });

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA was installed');
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // For iOS Safari, show install button if not in standalone mode
    if (this.isIOSDevice() && !this.isInStandaloneMode()) {
      console.log('📱 iOS device detected, showing install instructions');
      this.showInstallButton();
    }

    // Hide install button if already in standalone mode
    if (this.isInStandaloneMode()) {
      console.log('📱 App already installed (standalone mode)');
      this.hideInstallButton();
    }
  }

  /**
   * Check if device is mobile (iPhone or Android)
   */
  isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check for iPhone/iPad
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    // Check for Android
    const isAndroid = /android/i.test(userAgent);
    
    return isIOS || isAndroid;
  }

  /**
   * Check if device is iOS
   */
  isIOSDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  }

  /**
   * Check if app is running in standalone mode (already installed)
   */
  isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }

  /**
   * Show the install button
   */
  showInstallButton() {
    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
      installBtn.style.display = 'flex';
    }
  }

  /**
   * Hide the install button
   */
  hideInstallButton() {
    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  /**
   * Handle install button click
   */
  async handleInstallPrompt() {
    const installBtn = document.getElementById("installBtn");
    
    if (this.isIOSDevice()) {
      // iOS Safari - show install instructions
      this.showIOSInstallInstructions();
      return;
    }

    if (!this.deferredPrompt) {
      console.log('📱 No install prompt available');
      return;
    }

    // Show the install prompt (Android)
    try {
      installBtn.disabled = true;
      installBtn.textContent = '📱 Installing...';
      
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('📱 User accepted the install prompt');
        this.hideInstallButton();
      } else {
        console.log('📱 User dismissed the install prompt');
      }
      
      // Clear the deferredPrompt so it can only be used once
      this.deferredPrompt = null;
    } catch (error) {
      console.error('📱 Error showing install prompt:', error);
    } finally {
      installBtn.disabled = false;
      installBtn.innerHTML = '📱 Install App';
    }
  }

  /**
   * Show iOS install instructions
   */
  showIOSInstallInstructions() {
    const message = `To install this app on your iPhone/iPad:

1. Tap the Share button (📤) in Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm

The app will appear on your home screen like a native app!`;

    alert(message);
  }
}
