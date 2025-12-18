// Application state
let currentStep = 1;
let applicationId = null;
let applicationData = {};

// Course data
const courses = {
    'Diploma': [
        'Diploma in Computer Engineering',
        'Diploma in Mechanical Engineering',
        'Diploma in Civil Engineering',
        'Diploma in Electrical Engineering'
    ],
    'Undergraduate': [
        'B.Tech Computer Science & Engineering',
        'B.Tech Information Technology',
        'B.Tech Mechanical Engineering',
        'B.Tech Civil Engineering',
        'B.Tech Electrical Engineering',
        'BBA (Bachelor of Business Administration)',
        'BCA (Bachelor of Computer Applications)'
    ],
    'Postgraduate': [
        'M.Tech Computer Science & Engineering',
        'M.Tech Information Technology',
        'MBA (Master of Business Administration)',
        'MCA (Master of Computer Applications)'
    ],
    'PhD': [
        'Ph.D. in Computer Science',
        'Ph.D. in Engineering',
        'Ph.D. in Management',
        'Ph.D. in Science'
    ]
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    loadDraft();
    checkURLParams();
    setupAutoSave();
});

// Load draft from localStorage
function loadDraft() {
    const draft = localStorage.getItem('applicationDraft');
    
    if (draft) {
        try {
            const data = JSON.parse(draft);
            
            // Populate form fields
            Object.keys(data).forEach(key => {
                const field = document.getElementById(key);
                if (field && field.type !== 'file') {
                    field.value = data[key] || '';
                }
            });
            
            // Update course dropdown if program type exists
            if (data.programType) {
                updateCourses();
                setTimeout(() => {
                    if (data.courseName) {
                        document.getElementById('courseName').value = data.courseName;
                    }
                }, 100);
            }
            
            // Resume from saved step
            if (data.currentStep && data.currentStep > 1) {
                const resume = confirm('You have a saved draft. Would you like to continue where you left off?');
                if (resume) {
                    goToStep(data.currentStep);
                }
            }
            
            showDraftIndicator();
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

// Save draft to localStorage
function saveDraft() {
    const formData = {};
    const form = document.getElementById('applicationForm');
    const inputs = form.querySelectorAll('input:not([type="file"]), select, textarea');
    
    inputs.forEach(input => {
        formData[input.id] = input.value;
    });
    
    formData.currentStep = currentStep;
    formData.lastSaved = new Date().toISOString();
    
    localStorage.setItem('applicationDraft', JSON.stringify(formData));
    showDraftIndicator();
}

// Auto-save every 30 seconds
function setupAutoSave() {
    setInterval(() => {
        if (currentStep < 5) {
            saveDraft();
        }
    }, 30000);
}

// Show draft saved indicator
function showDraftIndicator() {
    const indicator = document.getElementById('draftIndicator');
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

// Check URL parameters
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const program = urlParams.get('program');
    
    if (program) {
        for (let [type, courseList] of Object.entries(courses)) {
            if (courseList.includes(program)) {
                document.getElementById('programType').value = type;
                updateCourses();
                setTimeout(() => {
                    document.getElementById('courseName').value = program;
                }, 100);
                break;
            }
        }
    }
}

// Update course dropdown
function updateCourses() {
    const programType = document.getElementById('programType').value;
    const courseSelect = document.getElementById('courseName');
    
    courseSelect.innerHTML = '<option value="">Select course</option>';
    
    if (programType && courses[programType]) {
        courses[programType].forEach(course => {
            const option = document.createElement('option');
            option.value = course;
            option.textContent = course;
            courseSelect.appendChild(option);
        });
    }
}

// Handle file selection
function handleFileSelect(input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    
    if (file) {
        // Check file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            input.value = '';
            preview.classList.remove('show');
            return;
        }
        
        preview.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        preview.classList.add('show');
    } else {
        preview.classList.remove('show');
    }
}

// Validate current step
function validateStep(step) {
    const stepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    const inputs = stepElement.querySelectorAll('input[required], select[required], textarea[required]');
    let valid = true;
    
    inputs.forEach(input => {
        if (input.type === 'file') {
            if (!input.files || input.files.length === 0) {
                valid = false;
                input.closest('.upload-label').style.borderColor = '#ef4444';
            } else {
                input.closest('.upload-label').style.borderColor = '#e0e0e0';
            }
        } else {
            if (!input.value.trim()) {
                valid = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
            }
        }
    });
    
    if (!valid) {
        alert('Please fill all required fields');
    }
    
    return valid;
}

// Save and move to next step
function saveAndNext(step) {
    if (!validateStep(currentStep)) return;
    
    saveDraft();
    goToStep(step);
}

// Go to previous step
function prevStep(step) {
    saveDraft();
    goToStep(step);
}

// Go to specific step
function goToStep(step) {
    // Update step visibility
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step-item[data-step="${currentStep}"]`).classList.remove('active');
    
    // Mark previous steps as completed
    for (let i = 1; i < step; i++) {
        document.querySelector(`.step-item[data-step="${i}"]`).classList.add('completed');
    }
    
    currentStep = step;
    
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
    document.querySelector(`.step-item[data-step="${step}"]`).classList.add('active');
    
    // Update progress line
    const progress = ((step - 1) / 4) * 100;
    document.querySelector('.progress-line::before').style.width = `${progress}%`;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Submit application
async function submitApplication() {
    if (!validateStep(4)) return;
    
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/application/create', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            applicationId = data.applicationId;
            applicationData = {
                email: formData.get('email'),
                phone: formData.get('phone')
            };
            
            document.getElementById('displayApplicationId').textContent = data.applicationNumber;
            
            // Clear draft after successful submission
            localStorage.removeItem('applicationDraft');
            
            goToStep(5);
        } else {
            alert(data.message || 'Error submitting application');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting application. Please try again.');
    }
}

// Initiate Razorpay payment
async function initiatePayment() {
    if (!applicationId) {
        alert('Application ID not found');
        return;
    }
    
    try {
        const orderResponse = await fetch('/payment/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicationId: applicationId,
                email: applicationData.email,
                phone: applicationData.phone
            })
        });
        
        const orderData = await orderResponse.json();
        
        if (!orderData.success) {
            alert('Error creating payment order');
            return;
        }
        
        const options = {
            key: orderData.keyId || 'rzp_test_xxxxx',
            amount: orderData.amount,
            currency: orderData.currency,
            order_id: orderData.orderId,
            name: 'Swaminarayan University',
            description: 'Application Fee',
            image: '/images/logo.png',
            prefill: {
                name: document.getElementById('fullName').value,
                email: applicationData.email,
                contact: applicationData.phone
            },
            theme: {
                color: '#DC2626'
            },
            handler: async function (response) {
                const verifyResponse = await fetch('/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpayOrderId: orderData.orderId,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        applicationId: applicationId
                    })
                });
                
                const verifyData = await verifyResponse.json();
                
                if (verifyData.success) {
                    window.location.href = `/application/success/${applicationId}`;
                } else {
                    alert('Payment verification failed');
                }
            },
            modal: {
                ondismiss: function() {
                    alert('Payment cancelled. You can complete payment later from your dashboard.');
                }
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('Payment error:', error);
        alert('Error initiating payment');
    }
}
