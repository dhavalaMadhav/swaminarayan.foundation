/**
 * Swaminarayan University - Main JavaScript File
 * Handles form validation, file uploads, and general UI interactions
 */

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate Indian phone number
 */
function isValidPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate file size
 */
function isValidFileSize(file, maxSizeMB = 5) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate file type
 */
function isValidFileType(file, allowedTypes) {
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return allowedTypes.includes(fileExtension);
}

/**
 * Show error message for form field
 */
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  field.classList.add('error');
  
  // Remove existing error message
  const existingError = field.parentElement.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Add new error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.color = '#ef4444';
  errorDiv.style.fontSize = '0.875rem';
  errorDiv.style.marginTop = '0.25rem';
  errorDiv.textContent = message;
  field.parentElement.appendChild(errorDiv);
}

/**
 * Clear error message for form field
 */
function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  field.classList.remove('error');
  
  const errorMessage = field.parentElement.querySelector('.error-message');
  if (errorMessage) {
    errorMessage.remove();
  }
}

/**
 * Clear all errors in a form
 */
function clearAllErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  const errorMessages = form.querySelectorAll('.error-message');
  errorMessages.forEach(msg => msg.remove());
  
  const errorFields = form.querySelectorAll('.error');
  errorFields.forEach(field => field.classList.remove('error'));
}

/**
 * Show loading spinner
 */
function showLoading(buttonElement, text = 'Processing...') {
  if (!buttonElement) return;
  
  buttonElement.disabled = true;
  buttonElement.dataset.originalText = buttonElement.textContent;
  buttonElement.innerHTML = `<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-radius: 50%; border-top-color: transparent; animation: spin 0.8s linear infinite; margin-right: 8px;"></span>${text}`;
}

/**
 * Hide loading spinner
 */
function hideLoading(buttonElement) {
  if (!buttonElement || !buttonElement.dataset.originalText) return;
  
  buttonElement.disabled = false;
  buttonElement.textContent = buttonElement.dataset.originalText;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Toast styles
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: '10000',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '400px'
  });
  
  // Set background based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#2563eb'
  };
  toast.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);

// ==========================================
// FORM VALIDATION
// ==========================================

/**
 * Validate required fields in a form step
 */
function validateFormStep(stepNumber) {
  const step = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
  if (!step) return true;
  
  const requiredFields = step.querySelectorAll('[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    const fieldId = field.id;
    const value = field.value.trim();
    
    // Clear previous errors
    clearError(fieldId);
    
    // Check if empty
    if (!value) {
      showError(fieldId, 'This field is required');
      isValid = false;
      return;
    }
    
    // Specific validations based on field type
    if (field.type === 'email' && !isValidEmail(value)) {
      showError(fieldId, 'Please enter a valid email address');
      isValid = false;
    } else if (field.type === 'tel' && !isValidPhone(value)) {
      showError(fieldId, 'Please enter a valid 10-digit Indian mobile number');
      isValid = false;
    } else if (field.type === 'number') {
      const min = parseFloat(field.min);
      const max = parseFloat(field.max);
      const numValue = parseFloat(value);
      
      if (!isNaN(min) && numValue < min) {
        showError(fieldId, `Value must be at least ${min}`);
        isValid = false;
      } else if (!isNaN(max) && numValue > max) {
        showError(fieldId, `Value must not exceed ${max}`);
        isValid = false;
      }
    } else if (field.type === 'date') {
      const selectedDate = new Date(value);
      const today = new Date();
      
      if (fieldId === 'dateOfBirth') {
        const age = today.getFullYear() - selectedDate.getFullYear();
        if (age < 15 || age > 100) {
          showError(fieldId, 'Please enter a valid date of birth (age 15-100)');
          isValid = false;
        }
      }
    } else if (field.type === 'file') {
      if (!field.files || field.files.length === 0) {
        showError(fieldId, 'Please select a file');
        isValid = false;
      }
    }
  });
  
  return isValid;
}

/**
 * Validate file upload
 */
function validateFileUpload(fileInputId, allowedTypes, maxSizeMB = 5) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showError(fileInputId, 'Please select a file');
    return false;
  }
  
  const file = fileInput.files[0];
  
  // Check file size
  if (!isValidFileSize(file, maxSizeMB)) {
    showError(fileInputId, `File size must not exceed ${maxSizeMB}MB`);
    return false;
  }
  
  // Check file type
  if (!isValidFileType(file, allowedTypes)) {
    showError(fileInputId, `Allowed file types: ${allowedTypes.join(', ')}`);
    return false;
  }
  
  clearError(fileInputId);
  return true;
}

// ==========================================
// FILE UPLOAD PREVIEW
// ==========================================

/**
 * Show file preview for images
 */
function setupFilePreview(fileInputId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  
  fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    
    // Show file name and size
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    
    // Remove existing preview
    const existingPreview = this.parentElement.querySelector('.file-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    // Create preview element
    const preview = document.createElement('div');
    preview.className = 'file-preview';
    preview.style.marginTop = '0.5rem';
    preview.style.padding = '0.5rem';
    preview.style.backgroundColor = '#f3f4f6';
    preview.style.borderRadius = '4px';
    preview.style.fontSize = '0.875rem';
    
    // For images, show thumbnail
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = `
          <img src="${e.target.result}" alt="Preview" style="max-width: 100px; max-height: 100px; border-radius: 4px; margin-bottom: 0.5rem; display: block;">
          <div><strong>File:</strong> ${fileName}</div>
          <div><strong>Size:</strong> ${fileSize}</div>
        `;
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = `
        <div><strong>File:</strong> ${fileName}</div>
        <div><strong>Size:</strong> ${fileSize}</div>
      `;
    }
    
    this.parentElement.appendChild(preview);
    
    // Clear error if file is selected
    clearError(fileInputId);
  });
}

// ==========================================
// SMOOTH SCROLLING
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('Swaminarayan University Website Loaded');
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Setup file previews for all file inputs
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    setupFilePreview(input.id);
  });
  
  // Add real-time validation for email and phone fields
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.value && !isValidEmail(this.value)) {
        showError(this.id, 'Please enter a valid email address');
      } else {
        clearError(this.id);
      }
    });
  });
  
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.value && !isValidPhone(this.value)) {
        showError(this.id, 'Please enter a valid 10-digit mobile number');
      } else {
        clearError(this.id);
      }
    });
    
    // Only allow numbers
    input.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  });
  
  // Add input restrictions for number fields
  const numberInputs = document.querySelectorAll('input[type="number"]');
  numberInputs.forEach(input => {
    input.addEventListener('input', function() {
      // Prevent negative values if min is 0
      if (this.min === '0' && parseFloat(this.value) < 0) {
        this.value = 0;
      }
    });
  });
});

// ==========================================
// CONTACT FORM HANDLER
// ==========================================

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate form
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    if (!name || !email || !subject || !message) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    
    // Simulate form submission
    const submitBtn = this.querySelector('button[type="submit"]');
    showLoading(submitBtn, 'Sending...');
    
    setTimeout(() => {
      hideLoading(submitBtn);
      showToast('Thank you for contacting us! We will get back to you soon.', 'success');
      this.reset();
    }, 1500);
  });
}

// ==========================================
// MOBILE MENU TOGGLE
// ==========================================

function setupMobileMenu() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  
  // Check if mobile menu button exists
  let mobileMenuBtn = document.getElementById('mobile-menu-btn');
  
  // Create mobile menu button if it doesn't exist
  if (!mobileMenuBtn && window.innerWidth <= 768) {
    mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.id = 'mobile-menu-btn';
    mobileMenuBtn.innerHTML = '☰';
    mobileMenuBtn.style.cssText = `
      display: block;
      font-size: 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: #1f2937;
    `;
    
    const headerContent = header.querySelector('.header-content');
    if (headerContent) {
      headerContent.insertBefore(mobileMenuBtn, headerContent.children[1]);
    }
    
    const nav = header.querySelector('.main-nav');
    if (nav) {
      nav.style.display = 'none';
      
      mobileMenuBtn.addEventListener('click', function() {
        if (nav.style.display === 'none') {
          nav.style.display = 'block';
          nav.style.position = 'absolute';
          nav.style.top = '100%';
          nav.style.left = '0';
          nav.style.right = '0';
          nav.style.backgroundColor = 'white';
          nav.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          nav.style.padding = '1rem';
          this.innerHTML = '✕';
        } else {
          nav.style.display = 'none';
          this.innerHTML = '☰';
        }
      });
    }
  }
}

// Setup mobile menu on load and resize
window.addEventListener('DOMContentLoaded', setupMobileMenu);
window.addEventListener('resize', function() {
  const nav = document.querySelector('.main-nav');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  
  if (window.innerWidth > 768) {
    if (nav) {
      nav.style.display = '';
      nav.style.position = '';
      nav.style.top = '';
      nav.style.left = '';
      nav.style.right = '';
      nav.style.backgroundColor = '';
      nav.style.boxShadow = '';
      nav.style.padding = '';
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.style.display = 'none';
    }
  } else {
    if (mobileMenuBtn) {
      mobileMenuBtn.style.display = 'block';
    }
  }
});

// ==========================================
// SCROLL TO TOP BUTTON
// ==========================================

function setupScrollToTop() {
  // Create scroll to top button
  const scrollBtn = document.createElement('button');
  scrollBtn.id = 'scroll-to-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #2563eb;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    display: none;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transition: all 0.3s;
  `;
  
  scrollBtn.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#1d4ed8';
    this.style.transform = 'translateY(-5px)';
  });
  
  scrollBtn.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#2563eb';
    this.style.transform = 'translateY(0)';
  });
  
  scrollBtn.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  document.body.appendChild(scrollBtn);
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      scrollBtn.style.display = 'block';
    } else {
      scrollBtn.style.display = 'none';
    }
  });
}

window.addEventListener('DOMContentLoaded', setupScrollToTop);

// ==========================================
// FORM AUTO-SAVE (Optional Enhancement)
// ==========================================

function setupFormAutoSave(formId, storageKey) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  // Load saved data
  const savedData = localStorage.getItem(storageKey);
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      Object.keys(data).forEach(key => {
        const field = form.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'file') {
          field.value = data[key];
        }
      });
    } catch (e) {
      console.error('Error loading saved form data:', e);
    }
  }
  
  // Save data on input
  const inputs = form.querySelectorAll('input:not([type="file"]), select, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', function() {
      const formData = {};
      inputs.forEach(field => {
        if (field.type !== 'file' && field.name) {
          formData[field.name] = field.value;
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(formData));
    });
  });
  
  // Clear saved data on successful submission
  form.addEventListener('submit', function() {
    localStorage.removeItem(storageKey);
  });
}

// ==========================================
// ACCESSIBILITY ENHANCEMENTS
// ==========================================

// Add keyboard navigation for dropdowns
document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const link = dropdown.querySelector('a');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    if (!link || !menu) return;
    
    link.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  });
});

// ==========================================
// LAZY LOADING FOR IMAGES (Optional)
// ==========================================

function setupLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    images.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

window.addEventListener('DOMContentLoaded', setupLazyLoading);

// ==========================================
// EXPORT FUNCTIONS FOR USE IN OTHER FILES
// ==========================================

// Make functions available globally for use in EJS templates
window.validateFormStep = validateFormStep;
window.validateFileUpload = validateFileUpload;
window.showError = showError;
window.clearError = clearError;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.setupFormAutoSave = setupFormAutoSave;

console.log('✅ Main.js loaded successfully');
