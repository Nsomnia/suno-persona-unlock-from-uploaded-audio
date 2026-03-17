// ==UserScript==
// @name         Suno Persona & Custom Model Unlocker (V5)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Unlocks Persona, Custom Voice, and Custom Model creation by overriding React's state.
// @author       User
// @match        *://*.suno.com/*
// @match        *://*.suno.ai/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Added all the new labels from your source code snippet
    const TARGET_LABELS =[
        "Create Persona", "Make Persona", "Persona",
        "Create a Voice", "Make Voice", "Voice",
        "Create Custom Model", "Make Custom Model", "Custom Model"
    ];

    function forceEnable(el) {
        if (el.dataset.sunoUnlocked) return; // Prevent duplicate processing

        // 1. Physical attributes (Force DOM elements to be active)
        el.disabled = false;
        el.removeAttribute('disabled');
        el.setAttribute('aria-disabled', 'false');

        // 2. Visuals (Remove Suno's Tailwind disabled classes)
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.classList.remove('opacity-50', 'pointer-events-none', 'cursor-not-allowed', 'text-gray-400');

        // 3. The React Patch (Bypass the 'v' variable from your JS snippet)
        const fiberKeys = Object.keys(el).filter(k => k.startsWith('__reactProps') || k.startsWith('__reactInternalInstance') || k.startsWith('__reactEventHandlers'));
        
        let patched = false;
        for (const key of fiberKeys) {
            const props = el[key];
            if (!props) continue;

            // Strip disabled flags from the React props directly
            if (props.disabled !== undefined) { props.disabled = false; patched = true; }
            if (props.isDisabled !== undefined) { props.isDisabled = false; patched = true; }
            
            // Clean up classNames injected by React
            if (props.className && typeof props.className === 'string') {
                props.className = props.className.replace(/opacity-\d+|pointer-events-none|cursor-not-allowed/g, '');
            }

            // Patch nested React children
            if (props.children) {
                const children = Array.isArray(props.children) ? props.children : [props.children];
                children.forEach(child => {
                    if (child && child.props) {
                        if (child.props.disabled !== undefined) child.props.disabled = false;
                        if (child.props.isDisabled !== undefined) child.props.isDisabled = false;
                    }
                });
            }
        }

        // Tag it so we don't spam the console
        el.dataset.sunoUnlocked = "true";
        console.log("🔓 [Suno Unlocker] Forcefully unlocked & patched:", el.innerText || el.getAttribute('aria-label'));
    }

    // Monitor the DOM for any new dropdown menus or buttons
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;

                const ariaLabel = node.getAttribute?.('aria-label') || "";
                const innerText = node.innerText || "";
                
                const isTarget = TARGET_LABELS.some(label => ariaLabel.includes(label) || innerText.includes(label));
                
                // Avoid grabbing entire page containers by checking string length
                if (isTarget && (ariaLabel || innerText.length < 50)) { 
                    forceEnable(node);
                }

                // Scan nested children in case it's a wrapper div (like a dropdown)
                TARGET_LABELS.forEach(label => {
                    const nestedTargets = node.querySelectorAll ? node.querySelectorAll(`[aria-label*="${label}"], [label*="${label}"]`) :[];
                    nestedTargets.forEach(t => forceEnable(t));
                });
            });
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Fallback: If you click to open a menu, scan the DOM immediately
    document.addEventListener('click', () => {
        setTimeout(forceEnableAll, 50);  // 50ms lets the React dropdown render
        setTimeout(forceEnableAll, 200); // 200ms catches slow animations
    }, true);

    function forceEnableAll() {
        document.querySelectorAll('button, [role="menuitem"], a, div[role="button"]').forEach(el => {
            const text = el.innerText || "";
            const aria = el.getAttribute('aria-label') || "";
            if (TARGET_LABELS.some(l => text.includes(l) || aria.includes(l))) {
                if (text.length < 50) { 
                    forceEnable(el);
                }
            }
        });
    }

    console.log("🚀[Suno Unlocker V5] Ready. Watching for Voice, Custom Model, and Persona UI.");
})();
