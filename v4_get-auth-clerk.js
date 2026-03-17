// ==UserScript==
// @name         Suno API Bypasser & Unlocker (V6.1)
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Bypasses React validation via direct API execution using Clerk Session Tokens.
// @author       User
// @match        *://*.suno.com/*
// @match        *://*.suno.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. CLERK AUTH TOKEN EXTRACTOR ---
    async function getBearerToken() {
        // Attempt 1: Standard Window Object (Suno's Clerk Instance)
        if (window.Clerk && window.Clerk.session) {
            try {
                const token = await window.Clerk.session.getToken();
                if (token) return `Bearer ${token}`;
            } catch (e) { console.warn("Clerk extraction failed", e); }
        }

        // Attempt 2: Read the fallback __session cookie
        const match = document.cookie.match(/(?:^|;)\s*__session=([^;]*)/);
        if (match && match[1]) {
            return `Bearer ${match[1]}`;
        }

        return null;
    }

    // --- 2. SAFE REACT CLIP-ID EXTRACTOR ---
    function extractClipId(obj, depth = 0, seen = new WeakSet()) {
        if (depth > 5 || !obj || typeof obj !== 'object') return null;
        if (seen.has(obj)) return null; 
        seen.add(obj);

        if (obj.clipId && typeof obj.clipId === 'string') return obj.clipId;
        if (obj.clip_id && typeof obj.clip_id === 'string') return obj.clip_id;
        
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                let res = extractClipId(obj[i], depth + 1, seen);
                if (res) return res;
            }
        } else {
            const keys = Object.keys(obj);
            for (let key of keys) {
                if (['children', '_owner', 'memoizedProps', 'stateNode', 'return', 'sibling'].includes(key)) continue;
                let res = extractClipId(obj[key], depth + 1, seen);
                if (res) return res;
            }
        }
        return null;
    }

    // --- 3. DIRECT RAW API EXECUTION ---
    async function forceApiCreate(clipId, type = "vox") {
        const token = await getBearerToken();
        if (!token) {
            alert("❌ Could not extract Bearer Token!\nMake sure you are fully logged in to Suno.");
            return;
        }

        const pName = prompt(`Bypass Active! Name your new ${type === 'vox' ? 'Voice' : 'Persona'}:`, "Forced " + clipId.substring(0, 5));
        if (!pName) return;

        // The exact payload Suno's backend expects, minus the "upload" restrictions
        const payload = {
            root_clip_id: clipId,
            name: pName,
            description: "Forced via Suno API Unlocker",
            is_public: false,
            persona_type: type
        };

        try {
            // Send the request exactly how Suno's native code does
            const res = await fetch("/api/persona/create/", {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                alert(`✅ SUCCESS! Backend accepted it.\nRefresh the page to see your new ${type === 'vox' ? 'Voice' : 'Persona'}!`);
            } else {
                alert(`❌ BACKEND REJECTED!\n\nThe server itself blocked this clip.\nStatus: ${res.status}\nDetail: ${JSON.stringify(data)}`);
            }
        } catch (err) {
            alert("API Call Error: " + err.message);
        }
    }

    // --- 4. DOM PATCHER & BUTTON INJECTOR ---
    const TARGET_LABELS =["Create Persona", "Make Persona", "Create a Voice", "Make Voice", "Create Custom Model", "Make Custom Model"];

    function patchElement(el) {
        if (el.dataset.apiBtnsInjected) return;

        // Force DOM visual unlock
        el.disabled = false;
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.classList.remove('opacity-50', 'pointer-events-none', 'cursor-not-allowed', 'text-gray-400');

        // Extract the Clip ID from React
        const fiberKeys = Object.keys(el).filter(k => k.startsWith('__reactProps'));
        let clipId = null;
        for (let key of fiberKeys) {
            clipId = extractClipId(el[key]);
            if (clipId) break;
        }

        // Fallback: Check the URL
        if (!clipId) {
            const urlMatch = window.location.href.match(/song\/([a-zA-Z0-9-]+)/);
            if (urlMatch) clipId = urlMatch[1];
        }

        if (clipId) {
            el.dataset.apiBtnsInjected = "true";

            // Inject Custom Dashboard
            const dashboard = document.createElement('div');
            dashboard.style.cssText = "display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.8); border-radius: 8px; border: 1px solid #ff0055; width: 100%; z-index: 99999;";
            
            const title = document.createElement('div');
            title.innerText = `🔓 Clip ID: ${clipId.substring(0,8)}...`;
            title.style.cssText = "color: #ff0055; font-size: 10px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;";
            
            const btnVoice = document.createElement('button');
            btnVoice.innerText = "⚡ Force Make Voice";
            btnVoice.style.cssText = "background: #8b5cf6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;";
            btnVoice.onclick = (e) => { e.preventDefault(); e.stopPropagation(); forceApiCreate(clipId, "vox"); };

            const btnLegacy = document.createElement('button');
            btnLegacy.innerText = "⚡ Force Make Persona";
            btnLegacy.style.cssText = "background: #ec4899; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;";
            btnLegacy.onclick = (e) => { e.preventDefault(); e.stopPropagation(); forceApiCreate(clipId, "legacy"); };

            const btnModel = document.createElement('button');
            btnModel.innerText = "⚡ Force Custom Model Menu";
            btnModel.style.cssText = "background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;";
            btnModel.onclick = (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                window.location.href = `/custom-model/new?clipIds=${clipId}`; 
            };

            dashboard.appendChild(title);
            dashboard.appendChild(btnVoice);
            dashboard.appendChild(btnLegacy);
            dashboard.appendChild(btnModel);
            
            if (el.parentNode) el.parentNode.insertBefore(dashboard, el.nextSibling);
        }
    }

    // --- 5. DOM OBSERVER ---
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                const ariaLabel = node.getAttribute?.('aria-label') || "";
                const innerText = node.innerText || "";
                
                if (TARGET_LABELS.some(l => ariaLabel.includes(l) || innerText.includes(l))) {
                    if (ariaLabel || innerText.length < 50) patchElement(node);
                }

                TARGET_LABELS.forEach(label => {
                    const nested = node.querySelectorAll ? node.querySelectorAll(`[aria-label*="${label}"],[label*="${label}"]`) :[];
                    nested.forEach(t => patchElement(t));
                });
            });
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('click', () => {
        setTimeout(() => {
            document.querySelectorAll('button, [role="menuitem"], a, div[role="button"]').forEach(el => {
                const text = el.innerText || "";
                const aria = el.getAttribute('aria-label') || "";
                if (TARGET_LABELS.some(l => text.includes(l) || aria.includes(l)) && text.length < 50) {
                    patchElement(el);
                }
            });
        }, 100);
    }, true);

    console.log("🚀[Suno Unlocker V6.1] Clerk Token Extractor Active.");
})();
