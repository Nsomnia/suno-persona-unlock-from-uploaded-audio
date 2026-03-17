// ==UserScript==
// @name         Suno Persona Unlocker (Dynamic Patch)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Unlocks Persona creation by targeting the aria-label and overriding React's minified state (E, g, etc.)
// @author       User
// @match        *://*.suno.com/*
// @match        *://*.suno.ai/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // The key phrases from your research
    const TARGET_LABEL = "Create Persona";
    const TARGET_TEXT = "Make Persona";
    const TOOLTIP_TEXT = "Personas cannot be created from audio uploads";

    /**
     * This function forces the React state to 'false' for disabled properties.
     * It doesn't care if the variable was 'E' or 'g'.
     */
    function forceEnable(el) {
        // 1. Physical attributes
        el.disabled = false;
        el.removeAttribute('disabled');
        el.setAttribute('aria-disabled', 'false');
        
        // 2. Visuals (Stop it from being grey/unclickable)
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.classList.remove('opacity-50', 'pointer-events-none');

        // 3. The React Patch (The "Logic" layer)
        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactProps') || k.startsWith('__reactInternalInstance'));
        if (el[fiberKey]) {
            const props = el[fiberKey];
            
            // If this is the button itself
            if (props.disabled !== undefined) props.disabled = false;
            if (props.isDisabled !== undefined) props.isDisabled = false;

            // If this is a Tooltip wrapper (the "I.m" from your snippet)
            if (props.label && props.label.includes(TOOLTIP_TEXT)) {
                props.isDisabled = false;
            }

            // Patch any nested children logic
            if (props.children?.props) {
                props.children.props.disabled = false;
                props.children.props.isDisabled = false;
            }
        }
    }

    // Monitor the DOM for the "Create Persona" button
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return; // Only element nodes

                // Check the node itself and its children
                const targets = node.querySelectorAll ? node.querySelectorAll(`[aria-label*="${TARGET_LABEL}"], [label*="${TARGET_LABEL}"]`) : [];
                
                // Also check if the node is the target
                const isTarget = node.getAttribute?.('aria-label')?.includes(TARGET_LABEL) || 
                                 node.innerText?.includes(TARGET_TEXT);

                if (isTarget) forceEnable(node);
                targets.forEach(t => forceEnable(t));
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Final fallback: If you click anywhere, try to unlock again (helps with mobile menus)
    document.addEventListener('click', () => setTimeout(forceEnableAll, 100), true);

    function forceEnableAll() {
        document.querySelectorAll('button, [role="menuitem"]').forEach(el => {
            if (el.innerText?.includes(TARGET_TEXT) || el.getAttribute('aria-label')?.includes(TARGET_LABEL)) {
                forceEnable(el);
            }
        });
    }

    console.log("Suno Unlocker 4.0: Ready to intercept 'Create Persona' (Dynamic Var Mode)");
})();
