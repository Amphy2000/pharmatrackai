import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation, useNavigate } from 'react-router-dom';

const OnboardingTour: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const driverObj = useRef<any>(null);

    // Define steps
    const steps = [
        {
            element: 'body',
            popover: {
                title: '👋 Welcome to PharmaTrack!',
                description: 'We are so excited to have you here! This quick tour will show you how to use our AI tools to run your pharmacy faster and easier. Ready to see the magic?',
                side: 'center',
                align: 'center',
            },
            route: '/dashboard',
        },
        {
            element: '#tour-invoice-scanner',
            popover: {
                title: '📸 Snap & Stock',
                description: 'Instead of typing in long lists of medicine, just take a clear photo of your invoice here. Our AI reads the handwriting and adds the medicine to your shelf instantly!',
                side: 'bottom',
                align: 'start',
            },
            route: '/dashboard',
        },
        {
            element: '#tour-ai-insights',
            popover: {
                title: '💡 Your Smart Assistant',
                description: 'Check this box daily! It tells you exactly which medicines are about to expire and shows you how to make more profit based on what your customers are buying.',
                side: 'top',
                align: 'start',
            },
            route: '/dashboard',
        },
        {
            element: '#tour-add-product',
            popover: {
                title: '📦 Your Digital Shelf',
                description: 'If you need to add one or two items manually, use this button. It keeps your stock organized so you always know what you have in the shop.',
                side: 'bottom',
                align: 'start',
            },
            route: '/inventory',
        },
        {
            element: '#tour-pos-link',
            popover: {
                title: '💰 Sell in Seconds',
                description: 'When a customer walks in, click here. It\'s like a digital kalkulator that records your sales and prints receipts automatically.',
                side: 'bottom',
                align: 'center',
            },
            route: '/dashboard',
        },
        {
            element: '#tour-help-button',
            popover: {
                title: '❓ Always Here to Help',
                description: 'Got stuck? Just click this question mark anytime to see these guides again. You\'ve got this!',
                side: 'bottom',
                align: 'end',
            },
            route: '/dashboard',
        },
    ];

    useEffect(() => {
        // Initialize driver
        driverObj.current = driver({
            showProgress: false,
            animate: true,
            allowClose: true,
            overlayOpacity: 0.75,
            stagePadding: 4,
            doneBtnText: 'Finish',
            nextBtnText: 'Next',
            prevBtnText: 'Back',
            onNextClick: () => {
                const nextStepIndex = (driverObj.current.getActiveIndex() || 0) + 1;
                handleTransition(nextStepIndex);
            },
            onPrevClick: () => {
                const prevStepIndex = (driverObj.current.getActiveIndex() || 0) - 1;
                handleTransition(prevStepIndex);
            },
            onCloseClick: () => {
                localStorage.setItem('tour_completed_', 'true');
                driverObj.current.destroy();
            },
        });

        // Start tour if not completed
        const isCompleted = localStorage.getItem('tour_completed_');
        if (!isCompleted && location.pathname === '/dashboard') {
            const timer = setTimeout(() => {
                driverObj.current.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                driverObj.current.drive();
            }, 2000);
            return () => clearTimeout(timer);
        }

        // Listen for manual trigger
        const handleManualStart = () => {
            navigate('/dashboard');
            setTimeout(() => {
                driverObj.current.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                driverObj.current.drive();
            }, 500);
        };

        window.addEventListener('start-onboarding-tour', handleManualStart);
        return () => window.removeEventListener('start-onboarding-tour', handleManualStart);
    }, []);

    const handleTransition = (stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= steps.length) {
            if (stepIndex >= steps.length) {
                localStorage.setItem('tour_completed_', 'true');
                driverObj.current.destroy();
            }
            return;
        }

        const targetStep = steps[stepIndex];

        if (targetStep.route !== location.pathname) {
            // Save state and navigate
            localStorage.setItem('onboarding_tour_step', stepIndex.toString());
            navigate(targetStep.route);
        } else {
            driverObj.current.moveTo(stepIndex);
        }
    };

    // Resumption logic
    useEffect(() => {
        const savedStep = localStorage.getItem('onboarding_tour_step');
        if (savedStep && driverObj.current) {
            const stepIndex = parseInt(savedStep, 10);
            localStorage.removeItem('onboarding_tour_step');

            // Wait for navigation and rendering
            setTimeout(() => {
                driverObj.current.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                driverObj.current.drive(stepIndex);
            }, 500);
        }
    }, [location.pathname]);

    return null;
};

export default OnboardingTour;
