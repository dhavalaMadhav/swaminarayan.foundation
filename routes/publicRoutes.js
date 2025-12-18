import express from 'express';

const router = express.Router();

// Public Pages
router.get('/', (req, res) => {
  res.render('pages/home', { title: 'Home - Swaminarayan University' });
});

router.get('/about', (req, res) => {
  res.render('pages/about', { title: 'About Us - Swaminarayan University' });
});
router.get('/about/about-su', (req, res) => {
    res.render('pages/about', { 
        title: 'About SU - Swaminarayan University',
        currentPage: 'about'
    });
});

// router.get('/about/authorities', (req, res) => {
//     res.render('about/authorities', { 
//         title: 'Authorities of University - Swaminarayan University',
//         currentPage: 'about'
//     });
// });

// router.get('/about/recognitions', (req, res) => {
//     res.render('about/recognitions', { 
//         title: 'Recognitions & Approvals - Swaminarayan University',
//         currentPage: 'about'
//     });
// });

// router.get('/about/awards', (req, res) => {
//     res.render('about/awards', { 
//         title: 'Awards & Achievements - Swaminarayan University',
//         currentPage: 'about'
//     });
// });

router.get('/programs', (req, res) => {
  res.render('pages/programs', { title: 'Programs - Swaminarayan University' });
});

router.get('/admissions', (req, res) => {
  res.render('pages/admissions', { title: 'Admissions - Swaminarayan University' });
});
// Admissions Routes
router.get('/admissions/how-to-apply', (req, res) => {
    res.render('pages/admissions', { 
        title: 'How to Apply - Swaminarayan University',
        currentPage: 'admissions'
    });
});

router.get('/admissions/online-application', (req, res) => {
    res.render('pages/apply', { 
        title: 'Online Application Form - Swaminarayan University',
        currentPage: 'admissions'
    });
});

// router.get('/admissions/scholarship', (req, res) => {
//     res.render('pages/scholarship', { 
//         title: 'Scholarship - Swaminarayan University',
//         currentPage: 'admissions'
//     });
// });


router.get('/apply', (req, res) => {
  res.render('pages/apply', { title: 'Apply Online - Swaminarayan University' });
});

router.get('/placement', (req, res) => {
  res.render('pages/placements', { title: 'Apply Online - Swaminarayan University' });
});

router.get('/contact', (req, res) => {
  res.render('pages/contact', { title: 'Contact Us - Swaminarayan University' });
});

router.get('/success/:applicationId', async (req, res) => {
  res.render('pages/success', {
    title: 'Application Successful',
    applicationId: req.params.applicationId
  });
});

export default router;
