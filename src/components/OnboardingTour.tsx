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
            route: '/inventory',
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

    // Use window.location.pathname to avoid stale closure issues
    const handleTransition = (stepIndex: number) => {
        if (stepIndex < 0 || stepIndex >= steps.length) {
            if (stepIndex >= steps.length) {
                localStorage.setItem('tour_completed_v1', 'true');
                driverObj.current?.destroy();
            }
            return;
        }

        const targetStep = steps[stepIndex];
        const currentPath = window.location.pathname;

        if (targetStep.route && targetStep.route !== currentPath) {
            // Save state and navigate
            localStorage.setItem('onboarding_tour_step', stepIndex.toString());
            driverObj.current?.destroy(); // Clean up before navigation
            navigate(targetStep.route);
        } else {
            driverObj.current?.moveTo(stepIndex);
        }
    };

    useEffect(() => {
        // Initialize driver
        driverObj.current = driver({
            showProgress: false,
            animate: true,
            allowClose: true,
            overlayOpacity: 0.85,
            stagePadding: 10,
            doneBtnText: 'Finish',
            nextBtnText: 'Next',
            prevBtnText: 'Back',
            onNextClick: () => {
                const activeIndex = driverObj.current?.getActiveIndex();
                if (typeof activeIndex === 'number') {
                    handleTransition(activeIndex + 1);
                }
            },
            onPrevClick: () => {
                const activeIndex = driverObj.current?.getActiveIndex();
                if (typeof activeIndex === 'number') {
                    handleTransition(activeIndex - 1);
                }
            },
            onCloseClick: () => {
                localStorage.setItem('tour_completed_v1', 'true');
                driverObj.current?.destroy();
            },
        });

        // Initial Start Logic
        const isCompleted = localStorage.getItem('tour_completed_v1');
        const currentPath = window.location.pathname;

        if (!isCompleted && currentPath === '/dashboard') {
            const timer = setTimeout(() => {
                if (driverObj.current && !localStorage.getItem('onboarding_tour_step')) {
                    driverObj.current.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                    driverObj.current.drive();
                }
            }, 3500);
            return () => clearTimeout(timer);
        }

        // Listen for manual trigger
        const handleManualStart = () => {
            if (window.location.pathname !== '/dashboard') {
                navigate('/dashboard');
                setTimeout(() => {
                    driverObj.current?.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                    driverObj.current?.drive();
                }, 1000);
            } else {
                driverObj.current?.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                driverObj.current?.drive();
            }
        };

        window.addEventListener('start-onboarding-tour', handleManualStart);
        return () => {
            window.removeEventListener('start-onboarding-tour', handleManualStart);
            driverObj.current?.destroy();
        };
    }, [navigate]); // navigate is stable, but adding it for completeness

    // Resumption logic - Triggers on page change
    useEffect(() => {
        const savedStep = localStorage.getItem('onboarding_tour_step');
        if (savedStep && driverObj.current) {
            const stepIndex = parseInt(savedStep, 10);
            localStorage.removeItem('onboarding_tour_step');

            // Wait a bit longer for page content to be ready
            const timer = setTimeout(() => {
                const element = steps[stepIndex].element;
                const el = element === 'body' ? document.body : document.querySelector(element);

                if (el && driverObj.current) {
                    driverObj.current.setSteps(steps.map(s => ({ element: s.element, popover: s.popover })));
                    driverObj.current.drive(stepIndex);
                }
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [location.pathname]);

    return null;
};

export default OnboardingTour;
