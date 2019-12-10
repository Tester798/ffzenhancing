'use strict';
(() => {
    let version = '6.6';
    let notify_icon = __ffzenhancing_base_url + 'notify.ico';
    let notify_icon_original = document.querySelector('link[rel="icon"]') && document.querySelector('link[rel="icon"]').href;
    let ffzenhancing_focus_input_area_after_emote_select;
    let ffzenhancing_keep_delay_low;
    let ffzenhancing_keep_delay_low_delay;
    let ffzenhancing_keep_delay_low_delay_low_latency;
    let ffzenhancing_keep_delay_low_rate;
    let ffzenhancing_keep_delay_low_latency_was_changed;
    let ffzenhancing_fix_tooltips;
    let ffzenhancing_doubleclick_username_paste_in_chat;
    let ffzenhancing_move_users_in_chat_to_bottom;
    let ffzenhancing_hide_rooms_header;
    let ffzenhancing_auto_reload_on_error_2000;
    let ffzenhancing_auto_reload_on_hanged_video;
    let ffzenhancing_auto_reload_on_hanged_video_after;
    let ffzenhancing_auto_reload_on_hanged_video_currentTime;
    let ffzenhancing_auto_check_player_quality;
    let ffzenhancing_pin_mentions;
    let ffzenhancing_reset_after_delay;
    let ffzenhancing_reset_after_delay_delay;
    let ffzenhancing_animate_static_gif_emotes_on_mouse_hover;
    let ffzenhancing_auto_click_claim_bonus_points;
    let timeoutPeriodicCheckVideoInfo = 0;
    let handlers_already_attached = {};
    let timers = {};
    let timeoutShowCard;
    let ignore_next_event = false;
    let element_users_in_chat;
    let current_player_volume;
    let current_player_muted;
    let current_player_quality;
    let added_styles = {};
    let visibility_hook_enabled = false;
    let previous_visibility_getter;


    function getElementByXpath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }


    function visibilityHookProc() {
        if (visibility_hook_enabled) return false;
        if (previous_visibility_getter) return previous_visibility_getter();
        return document.visibilityState === 'hidden';                    
    }


    function enableVisibilityHook() {
        visibility_hook_enabled = true;
        let tmp = Object.getOwnPropertyDescriptor(document, 'hidden');
        if (tmp) { // custom getter already defined
            if (tmp.get === visibilityHookProc) return; // our hook already defined
            previous_visibility_getter = tmp.get; // saving previous hook
        }
        try {
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                get: visibilityHookProc
            });
        } catch {}
    }


    function disableVisibilityHook() {
        visibility_hook_enabled = false;
    }


    function addStyleToSite(style_id, style_text) {
        if (added_styles[style_id]) return;
        let style = document.createElement('style');
        style.textContent = style_text;
        document.head.appendChild(style);
        added_styles[style_id] = style;
    }


    function removeStyleFromSite(style_id) {
        if (!added_styles[style_id]) return;
        document.head.removeChild(added_styles[style_id]);
        delete added_styles[style_id];
    }


    function processStaticEmoteRestore(el) {
        el.srcset = el.srcset.replace(/https:\/\//g, 'https://cache.ffzap.com/https://');
    }


    function processStaticEmote(e, el, process_parent_children, skip_set_mouseout) {
        if (!el) return false;
        let processed_children = [];
        if (process_parent_children) {
            for (const child of el.parentNode.querySelectorAll('img')) {
                if (child == el) continue;
                let processed_child = processStaticEmote(e, child, false, true);
                if (processed_child) processed_children.push(processed_child);
            }
        }
        let can_process_el = el.srcset && el.srcset.startsWith('https://cache.ffzap.com/https://');
        if (processed_children.length == 0 && !can_process_el) return false;
        if (!skip_set_mouseout) {
            let proc = () => {
                if (can_process_el) processStaticEmoteRestore(el);
                for (const child of processed_children) {
                    processStaticEmoteRestore(child);
                }
                e.target.removeEventListener('mouseout', proc);
            };
            e.target.addEventListener('mouseout', proc);
        }
        if (can_process_el) {
            el.srcset = el.srcset.replace(/https:\/\/cache\.ffzap\.com\/https:\/\//g, 'https://');
            return el;
        }
        return false;
    }


    function onNotifyWindowFocus() {
        if (!document.hidden) document.querySelector('link[rel="icon"]').href = notify_icon_original;
    }


    function getCurrentPlayerState() {
        current_player_volume = undefined;
        current_player_muted = undefined;
        current_player_quality = undefined;
        try {
            current_player_volume = ffz.site.children.player.current.getVolume();
        } catch {}
        try {
            current_player_muted = ffz.site.children.player.current.isMuted();
        } catch {}
        try {
            current_player_quality = ffz.site.children.player.current.getQuality();
        } catch {}
    }


    function setCurrentPlayerState() {
        if (current_player_volume !== undefined) {
            try {
                ffz.site.children.player.current.setVolume(current_player_volume);
            } catch {}
        }
        if (current_player_muted !== undefined) {
            try {
                ffz.site.children.player.current.setMuted(current_player_muted);
            } catch {}
        }
        if (current_player_quality !== undefined && current_player_quality !== '') {
            try {
                ffz.site.children.player.current.setQuality(current_player_quality);
            } catch {}
        }
    }


    function ffzResetPlayer() {
        enableVisibilityHook();
        ffz.emit('site.player:reset');
        setTimeout(disableVisibilityHook, 5000);
    }


    function reactElSetValue(el, value) {
        if (!el) return;
        let lastValue = el.value;
        el.value = value;
        let event = new Event('input', {
            bubbles: true
        });
        let tracker = el._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        el.dispatchEvent(event);
    }


    function usernameElementClicked(el) {
        if (
            el.classList.contains('chat-author__display-name') ||
            el.classList.contains('chat-line__message-mention') ||
            (el.classList.contains('tw-link') && el.parentNode.parentNode.parentNode.classList.contains('viewer-card__display-name')) // chatter name link in viewer card
        ) {
            return true;
        }
        return false;
    }


    function clickFfzBigPlayButton() {
        const buttonPlay = document.querySelector('button[data-a-target="player-overlay-play-button"]');
        if (buttonPlay) {
            enableVisibilityHook();
            buttonPlay.click();
            setTimeout(disableVisibilityHook, 5000);
            return true;
        }
        return false;
    }


    function getVideoLiveAndNotPaused() {
        const video = document.querySelector('video');
        if (video) {
            let broadcast_id;
            try {
                broadcast_id = ffz.site.children.player.current.getSessionData()['BROADCAST-ID'];
            } catch {}
            if (broadcast_id !== undefined && !Number.isNaN(broadcast_id)) { // broadcast_id is NaN when user was offline or in vod, preventing endless refreshes
                if (video.readyState != 1) {
                    return video;
                }
            }
        }
        return false;
    }


    function playerQualityCheck(ignore_check) {
        if (!ignore_check && !ffzenhancing_auto_check_player_quality) return;
        if (timers['playerQualityCheck']) {
            clearTimeout(timers['playerQualityCheck']);
        }
        if (document.visibilityState !== 'hidden') {
            try {
                let def_quality = JSON.parse(window.localStorage.getItem('video-quality')).default;
                let player_quality = ffz.site.children.player.current.getQualities().find(q => q.group == def_quality);
                if (player_quality) {
                    ffz.site.children.player.current.setQuality(player_quality);
                }
            } catch {}
        }
        timers['playerQualityCheck'] = setTimeout(playerQualityCheck, 5000);
    }


    function error_2000_check() {
        if (!ffzenhancing_auto_reload_on_error_2000) {
            if (timers['error_2000_check']) {
                clearInterval(timers['error_2000_check']);
                delete timers['error_2000_check'];
            }
            return;
        }

        const video = getVideoLiveAndNotPaused();
        if (video) {
            for (const el of document.querySelectorAll('.content-overlay-gate')) {
                if (el.textContent.includes('#2000') || el.textContent.includes('#4000')) {
                    ffzResetPlayer();
                }
            }
        }

        if (!timers['error_2000_check']) {
            timers['error_2000_check'] = setInterval(error_2000_check, 2000);
        }
    }


    function playerFreezeCheck() {
        if (!ffzenhancing_auto_reload_on_hanged_video) {
            return;
        }
        if (timers['playerFreezeCheck']) {
            clearTimeout(timers['playerFreezeCheck']);
        }

        const video = getVideoLiveAndNotPaused();
        if (video) {
            if (!clickFfzBigPlayButton()) {
                if (ffzenhancing_auto_reload_on_hanged_video_currentTime == video.currentTime) {
                    ffzResetPlayer();
                }
                ffzenhancing_auto_reload_on_hanged_video_currentTime = video.currentTime;
            }
        }

        timers['playerFreezeCheck'] = setTimeout(playerFreezeCheck, ffzenhancing_auto_reload_on_hanged_video_after * 1000);
    }


    function schedulePeriodicCheckVideoInfo(ms) {
        clearTimeout(timeoutPeriodicCheckVideoInfo);
        timeoutPeriodicCheckVideoInfo = setTimeout(periodicCheckVideoInfo, ms || 500);
    }


    function increasePlayerPlaybackSpeed(video) {
        video.playbackRate = ffzenhancing_keep_delay_low_rate;
        ffzenhancing_keep_delay_low_latency_was_changed = true;
    }


    function resetPlayerPlaybackSpeed(video) {
        if (ffzenhancing_keep_delay_low_latency_was_changed) {
            video.playbackRate = 1;
            ffzenhancing_keep_delay_low_latency_was_changed = false;
        }
    }


    function periodicCheckVideoInfo() {
        const video = getVideoLiveAndNotPaused();
        if (video) {
            let stats;
            try {
                stats = ffz.site.children.player.current.stats;
            } catch {}
            if (stats) {
                const lat = stats.broadcasterLatency;
                if (ffzenhancing_reset_after_delay) {
                    if (lat > ffzenhancing_reset_after_delay_delay) {
                        ffzResetPlayer();
                        schedulePeriodicCheckVideoInfo(5000);
                        return;
                    }
                }
                if (ffzenhancing_keep_delay_low) {
                    let isLowDelayEnabled = false;
                    try {
                        isLowDelayEnabled = ffz.site.children.player.current.isLiveLowLatency() && window.localStorage.getItem('lowLatencyModeEnabled') !== 'false';
                    } catch {}    
                    const delay = isLowDelayEnabled ? ffzenhancing_keep_delay_low_delay_low_latency : ffzenhancing_keep_delay_low_delay;
                    if (lat > delay) {
                        increasePlayerPlaybackSpeed(video);
                        schedulePeriodicCheckVideoInfo();
                        return;
                    } else {
                        resetPlayerPlaybackSpeed(video);
                    }
                } else {
                    resetPlayerPlaybackSpeed(video);
                }
            }
        }
        if (ffzenhancing_keep_delay_low || ffzenhancing_reset_after_delay) schedulePeriodicCheckVideoInfo(5000);
    }


    function periodicCheckClaimBonus() {
        if (!ffzenhancing_auto_click_claim_bonus_points) return;
        let button = getElementByXpath('//button[.//div[contains(@class, "claimable-bonus__icon")]]');
        if (button && document.visibilityState === 'visible') button.click();
        if (timers['periodicCheckClaimBonus']) {
            clearTimeout(timers['periodicCheckClaimBonus']);
        }
        timers['periodicCheckClaimBonus'] = setTimeout(periodicCheckClaimBonus, 5000);
    }


    function processSettings_schedule() {
        setTimeout(processSettings, 1000);
    }


    function processSettings() {
        let el;
        let appendEl;

        // ffzenhancing_move_users_in_chat_to_bottom
        if (!window.location.href.endsWith('/squad')) {
            if (ffzenhancing_move_users_in_chat_to_bottom) {
                el = element_users_in_chat || document.querySelector('.rooms-header button[data-test-selector="chat-viewer-list"]');
                appendEl = document.querySelector('.chat-input__buttons-container > .tw-flex:first-child');
            } else {
                el = element_users_in_chat || document.querySelector('.chat-input__buttons-container button[data-test-selector="chat-viewer-list"]');
                appendEl = document.querySelector('.rooms-header > .tw-absolute');
            }
            if (el && appendEl) {
                el = el.parentNode;
                // let nodeBefore = null;
                // if (ffzenhancing_move_users_in_chat_to_bottom) {
                //     nodeBefore = appendEl.querySelector(':scope > div:nth-child(1)');
                // }
                // el.parentNode.removeChild(el);
                // appendEl.insertBefore(el, nodeBefore);
                el.parentNode.removeChild(el);
                appendEl.prepend(el);
                let tooltip = el.querySelector('.tw-tooltip');
                if (tooltip) {
                    if (ffzenhancing_move_users_in_chat_to_bottom) {
                        tooltip.classList.remove('tw-tooltip--down');
                        tooltip.classList.remove('tw-tooltip--align-right');
                        tooltip.classList.add('tw-tooltip--up');
                        tooltip.classList.add('tw-tooltip--align-left');
                    } else {
                        tooltip.classList.remove('tw-tooltip--up');
                        tooltip.classList.remove('tw-tooltip--align-left');
                        tooltip.classList.add('tw-tooltip--down');
                        tooltip.classList.add('tw-tooltip--align-right');
                    }
                }
            }
        }

        // ffzenhancing_hide_rooms_header
        if (!window.location.href.endsWith('/squad')) {
            el = document.querySelector('.room-selector .rooms-header');
            if (el) {
                if (ffzenhancing_hide_rooms_header) {
                    el.style.setProperty('display', 'none', 'important');
                    addStyleToSite('ffzenhancing_hide_rooms_header', 'button[data-a-target="chat-viewer-list"][aria-label="Close"] {margin-left: 30px;}');
                } else {
                    el.style.removeProperty('display');
                    removeStyleFromSite('ffzenhancing_hide_rooms_header');
                }
            }
        }

        // ffzenhancing_fix_tooltips
        if (ffzenhancing_fix_tooltips) {
            addStyleToSite('ffzenhancing_fix_tooltips', '.ffz__tooltip {pointer-events: none;}');
        } else {
            removeStyleFromSite('ffzenhancing_fix_tooltips');
        }

        // ffzenhancing_animate_static_gif_emotes_on_mouse_hover
        if (ffzenhancing_animate_static_gif_emotes_on_mouse_hover) {
            if (!handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover']) {
                handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover'] = e => {
                    if (e.target.nodeName == 'IMG' && e.target.classList.contains('chat-line__message--emote')) { // mouse over emote in chat
                        processStaticEmote(e, e.target, true);
                    } else if (e.target.nodeName == 'BUTTON' && e.target.classList.contains('emote-picker__emote-link')) { // mouse over emote in emote picker
                        processStaticEmote(e, e.target.querySelector('img'));
                    }
                };
                document.body.addEventListener('mouseover', handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover']);
            }
        } else {
            if (handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover']) {
                document.body.removeEventListener('mouseover', handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover']);
                delete handlers_already_attached['ffzenhancing_animate_static_gif_emotes_on_mouse_hover'];
            }
        }

        // ffzenhancing_pin_mentions
        if (handlers_already_attached['ffzenhancing_pin_mentions']) {
            handlers_already_attached['ffzenhancing_pin_mentions'].disconnect();
            delete handlers_already_attached['ffzenhancing_pin_mentions'];
            window.removeEventListener('visibilitychange', onNotifyWindowFocus);
        }
        if (ffzenhancing_pin_mentions) {
            window.addEventListener('visibilitychange', onNotifyWindowFocus);
            let chat_list;
            try {
                chat_list = ffz.site.children.chat.ChatContainer.first.state.chatListElement;
            } catch {}
            if (chat_list) {
                let chat_log;
                try {
                    chat_log = chat_list.querySelector('[role="log"]');
                } catch {}
                if (chat_log) {
                    let pinned_log = document.createElement('div');
                    pinned_log.setAttribute('style', 'position: absolute; background-color: var(--color-background-body); z-index: 1000; width: 100%;');
                    chat_log.parentNode.prepend(pinned_log);
                    handlers_already_attached['ffzenhancing_pin_mentions'] = new MutationObserver(mutations => {
                        mutations.forEach(mutation => {
                            if (mutation.addedNodes.length > 0) {
                                let chat_line = mutation.addedNodes[0];
                                setTimeout(() => {
                                    if (chat_line.matches('.ffz-mentioned')) {
                                        let cloned_chat_line = chat_line.cloneNode(true);
                                        cloned_chat_line.setAttribute('style', 'border: 1px solid red !important; border-top: none !important;');
                                        let close_button = document.createElement('div');
                                        close_button.setAttribute('style', 'width: 14px; cursor: pointer; top: 5px; right: 5px; position: absolute;');
                                        close_button.innerHTML = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" style="enable-background:new 0 0 45 45;" xml:space="preserve" version="1.1" id="svg2"><metadata id="metadata8"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/></cc:Work></rdf:RDF></metadata><defs id="defs6"><clipPath id="clipPath16" clipPathUnits="userSpaceOnUse"><path id="path18" d="M 0,36 36,36 36,0 0,0 0,36 Z"/></clipPath></defs><g transform="matrix(1.25,0,0,-1.25,0,45)" id="g10"><g id="g12"><g clip-path="url(#clipPath16)" id="g14"><g transform="translate(21.5332,17.9976)" id="g20"><path id="path22" style="fill:#dd2e44;fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 0,0 12.234,12.234 c 0.977,0.976 0.977,2.559 0,3.535 -0.976,0.977 -2.558,0.977 -3.535,0 L -3.535,3.535 -15.77,15.769 c -0.975,0.977 -2.559,0.977 -3.535,0 -0.976,-0.976 -0.976,-2.559 0,-3.535 L -7.07,0 -19.332,-12.262 c -0.977,-0.977 -0.977,-2.559 0,-3.535 0.488,-0.489 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.244 1.767,0.733 L -3.535,-3.535 8.699,-15.769 c 0.489,-0.488 1.128,-0.733 1.768,-0.733 0.639,0 1.279,0.245 1.767,0.733 0.977,0.976 0.977,2.558 0,3.535 L 0,0 Z"/></g></g></g></g></svg>';
                                        close_button.addEventListener('click', e => {
                                            e.currentTarget.parentNode.remove();
                                            delete e.currentTarget.parentNode;
                                        });
                                        const chat_author__display_name__orig = chat_line.querySelector('.chat-author__display-name');
                                        if (chat_author__display_name__orig) {
                                            const chat_author__display_name__cloned = cloned_chat_line.querySelector('.chat-author__display-name');
                                            if (chat_author__display_name__cloned) {
                                                chat_author__display_name__cloned.onclick = () => chat_author__display_name__orig.click();
                                            }
                                        }
                                        const chat_line__message_mention__orig = chat_line.querySelector('.chat-line__message-mention');
                                        if (chat_line__message_mention__orig) {
                                            const chat_line__message_mention__cloned = cloned_chat_line.querySelector('.chat-line__message-mention');
                                            if (chat_line__message_mention__cloned) {
                                                chat_line__message_mention__cloned.onclick = () => chat_line__message_mention__orig.click();
                                            }
                                        }
                                        cloned_chat_line.appendChild(close_button);
                                        pinned_log.appendChild(cloned_chat_line);
                                        if (document.hidden) document.querySelector('link[rel="icon"]').href = notify_icon;
                                    }
                                }, 500);
                            }
                        });
                    });
                    handlers_already_attached['ffzenhancing_pin_mentions'].observe(chat_log, {
                        childList: true,
                        subtree: false
                    });
                }
            }
        }
    }


    function setupHandlers() {
        if (!handlers_already_attached['ffzenhancing_focus_input_area_after_emote_select']) {
            handlers_already_attached['ffzenhancing_focus_input_area_after_emote_select'] = true;
            document.body.addEventListener('click', e => {
                if (ffzenhancing_focus_input_area_after_emote_select && e.target.classList.contains('emote-picker__emote-link')) {
                    setTimeout(() => {
                        let el = document.querySelector('.chat-input textarea');
                        let txt = el.value;
                        el.selectionStart = txt.length;
                        el.selectionEnd = txt.length;
                        el.focus();
                    });
                }
                if (ffzenhancing_fix_tooltips) {
                    setTimeout(() => {
                        let el = document.querySelector('.ffz__tooltip');
                        if (!el) return;
                        el.parentNode.removeChild(el);
                    });
                }
            });
        }
        if (!handlers_already_attached['ffzenhancing_doubleclick_username_paste_in_chat']) {
            handlers_already_attached['ffzenhancing_doubleclick_username_paste_in_chat'] = true;
            document.body.addEventListener('click', e => {
                if (!ffzenhancing_doubleclick_username_paste_in_chat) return;
                if (ignore_next_event) {
                    ignore_next_event = false;
                    return;
                }
                if (usernameElementClicked(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    clearTimeout(timeoutShowCard);
                    timeoutShowCard = setTimeout(() => {
                        ignore_next_event = true;
                        e.target.click();
                    }, 400);
                }
            }, true);
            document.body.addEventListener('dblclick', e => {
                if (!ffzenhancing_doubleclick_username_paste_in_chat) return;
                if (usernameElementClicked(e.target)) {
                    clearTimeout(timeoutShowCard);
                    let el = document.querySelector('.chat-input textarea');
                    let txt = el.value;
                    if (txt && txt.substr(-1) != ' ') {
                        txt = txt + ' ';
                    }
                    if (!e.target.innerText.startsWith('@')) {
                        txt = txt + '@';
                    }
                    txt = txt + e.target.innerText + ' ';
                    reactElSetValue(el, txt);
                    el.focus();
                }
            });
        }
    }


    function main_init() {
        class FFZEnhancingAddOn extends FrankerFaceZ.utilities.addon.Addon {
            constructor(...args) {
                super(...args);
                this.inject('settings');
                this.inject('site');


                // About
                this.settings.addUI('ffzenhancing.about', {
                    path: 'Add-Ons > FFZ Enhancing Add-On >> About @{"description": "Version ' + version + '"}'
                });


                // Input
                this.settings.add('ffzenhancing.focus_input_area_after_emote_select', {
                    default: true,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Input',
                        title: 'Focus Input Area After Emote Select',
                        description: 'Move focus to input area after emote select.',
                        component: 'setting-check-box',
                    },
                    changed: val => ffzenhancing_focus_input_area_after_emote_select = val
                });
                this.settings.add('ffzenhancing.doubleclick_username_paste_in_chat', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Input',
                        title: 'Double-Click Username to Reply',
                        description: 'Copy double-clicked username in chat to input field.',
                        component: 'setting-check-box',
                    },
                    changed: val => ffzenhancing_doubleclick_username_paste_in_chat = val
                });


                // Video Delay
                this.settings.add('ffzenhancing.keep_delay_low', {
                    default: true,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Keep Video Delay Low',
                        description: 'Keep video delay low by increasing video playing speed.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_keep_delay_low = val;
                        schedulePeriodicCheckVideoInfo();
                    }
                });
                this.settings.add('ffzenhancing.keep_delay_low_delay', {
                    default: 8.5,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Maximum Video Delay',
                        description: 'Maximum video delay after which video speed will be increased.',
                        component: 'setting-text-box',
                        process: val => parseFloat(val)
                    },
                    changed: val => ffzenhancing_keep_delay_low_delay = val
                });
                this.settings.add('ffzenhancing.keep_delay_low_delay_low_latency', {
                    default: 5,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Maximum Video Delay in Low Latency',
                        description: 'Maximum video delay in low latency mode after which video speed will be increased.',
                        component: 'setting-text-box',
                        process: val => parseFloat(val)
                    },
                    changed: val => ffzenhancing_keep_delay_low_delay_low_latency = val
                });
                this.settings.add('ffzenhancing.keep_delay_low_rate', {
                    default: 1.05,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Increased Video Playback Rate',
                        description: 'Video playback rate which will be set after Maximum Video Delay is reached.',
                        component: 'setting-text-box',
                        process: val => {
                            val = parseFloat(val);
                            if (isNaN(val) || !isFinite(val)) val = 1.05;
                            if (val < 1.01) val = 1.01;
                            if (val > 5) val = 5;
                            return val;
                        }
                    },
                    changed: val => ffzenhancing_keep_delay_low_rate = val
                });
                this.settings.add('ffzenhancing.reset_after_delay', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Reset Player After Big Delay',
                        description: 'Reset player if delay is too big.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_reset_after_delay = val;
                        schedulePeriodicCheckVideoInfo();
                    }
                });
                this.settings.add('ffzenhancing.reset_after_delay_delay', {
                    default: 30,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Video Delay',
                        title: 'Reset Player After Delay Bigger Than',
                        description: 'Reset player if delay is bigger than value specified.',
                        component: 'setting-text-box',
                        process: val => {
                            val = parseFloat(val);
                            if (isNaN(val) || !isFinite(val)) val = 10;
                            if (val < 10) val = 10;
                            return val;
                        }
                    },
                    changed: val => ffzenhancing_reset_after_delay_delay = val
                });


                // Layout
                this.settings.add('ffzenhancing.move_users_in_chat_to_bottom', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Layout',
                        title: 'Move "Users in Chat" Button to Bottom',
                        description: 'Move "Users in Chat" button from room header to bottom.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_move_users_in_chat_to_bottom = val;
                        processSettings();
                    }
                });
                this.settings.add('ffzenhancing.hide_rooms_header', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Layout',
                        title: 'Hide Rooms Header',
                        description: 'Hide rooms header element to inscrease chat height.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_hide_rooms_header = val;
                        processSettings();
                    }
                });


                // Other Settings
                this.settings.add('ffzenhancing.fix_tooltips', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Fix FFZ Tooltips',
                        description: 'Hide Hanged FFZ Tooltips on Mouse Click.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_fix_tooltips = val;
                        processSettings();
                    }
                });
                this.settings.add('ffzenhancing.pin_mentions', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Pin Mentioned Messages',
                        description: 'Pin messages with mentions at the top of the chat.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_pin_mentions = val;
                        processSettings();
                    }
                });
                this.settings.add('ffzenhancing.animate_static_gif_emotes_on_mouse_hover', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Animate Static GIF Emotes On Mouse Hover',
                        description: 'Enable animated GIF emotes when mouse hover over static emotes.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_animate_static_gif_emotes_on_mouse_hover = val;
                        processSettings();
                    }
                });
                this.settings.add('ffzenhancing.auto_click_claim_bonus_points', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Auto Click "Claim Bonus Points" Button',
                        description: 'Periodically check if "Claim Bonus Points" button is alailable and click it.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_click_claim_bonus_points = val;
                        periodicCheckClaimBonus();
                    }
                });


                // Player
                this.settings.add('ffzenhancing.auto_reload_on_error_2000', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Reload on Error #2000 or #4000',
                        description: 'Reload player automatically when network error #2000 or #4000 happens.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_reload_on_error_2000 = val;
                        error_2000_check();
                    }
                });
                this.settings.add('ffzenhancing.auto_reload_on_hanged_video', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Reload on Video Freeze',
                        description: 'Reload player automatically when video freezes.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_reload_on_hanged_video = val;
                        playerFreezeCheck();
                    }
                });
                this.settings.add('ffzenhancing.auto_check_player_quality', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Check Player Quality',
                        description: 'Reset player quality to default if different quality detected.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_check_player_quality = val;
                        playerQualityCheck();
                    }
                });
                this.settings.add('ffzenhancing.auto_reload_on_hanged_video_after', {
                    default: 4,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Reload on Video Freeze After',
                        description: 'Delay before player reload when video freezes.',
                        component: 'setting-text-box',
                        process: val => {
                            val = parseFloat(val);
                            if (isNaN(val) || !isFinite(val)) val = 4;
                            if (val < 4) val = 4;
                            if (val > 20) val = 20;
                            return val;
                        }
                    },
                    changed: val => {
                        ffzenhancing_auto_reload_on_hanged_video_after = val;
                        playerFreezeCheck();
                    }
                });


                this.enable();
            }
            onEnable() {
                this.log.debug('FFZ:FFZ Enhancing Add-On was enabled successfully.');
                ffzenhancing_focus_input_area_after_emote_select = this.settings.get('ffzenhancing.focus_input_area_after_emote_select');
                ffzenhancing_keep_delay_low = this.settings.get('ffzenhancing.keep_delay_low');
                ffzenhancing_keep_delay_low_delay = this.settings.get('ffzenhancing.keep_delay_low_delay');
                ffzenhancing_keep_delay_low_delay_low_latency = this.settings.get('ffzenhancing.keep_delay_low_delay_low_latency');
                ffzenhancing_keep_delay_low_rate = this.settings.get('ffzenhancing.keep_delay_low_rate');
                ffzenhancing_fix_tooltips = this.settings.get('ffzenhancing.fix_tooltips');
                ffzenhancing_doubleclick_username_paste_in_chat = this.settings.get('ffzenhancing.doubleclick_username_paste_in_chat');
                ffzenhancing_move_users_in_chat_to_bottom = this.settings.get('ffzenhancing.move_users_in_chat_to_bottom');
                ffzenhancing_hide_rooms_header = this.settings.get('ffzenhancing.hide_rooms_header');
                ffzenhancing_auto_reload_on_error_2000 = this.settings.get('ffzenhancing.auto_reload_on_error_2000');
                ffzenhancing_auto_reload_on_hanged_video = this.settings.get('ffzenhancing.auto_reload_on_hanged_video');
                ffzenhancing_auto_reload_on_hanged_video_after = this.settings.get('ffzenhancing.auto_reload_on_hanged_video_after');
                ffzenhancing_auto_check_player_quality = this.settings.get('ffzenhancing.auto_check_player_quality');
                ffzenhancing_pin_mentions = this.settings.get('ffzenhancing.pin_mentions');
                ffzenhancing_reset_after_delay = this.settings.get('ffzenhancing.reset_after_delay');
                ffzenhancing_reset_after_delay_delay = this.settings.get('ffzenhancing.reset_after_delay_delay');
                ffzenhancing_animate_static_gif_emotes_on_mouse_hover = this.settings.get('ffzenhancing.animate_static_gif_emotes_on_mouse_hover');
                ffzenhancing_auto_click_claim_bonus_points = this.settings.get('ffzenhancing.auto_click_claim_bonus_points');
                schedulePeriodicCheckVideoInfo();
                setupHandlers();
                error_2000_check();
                playerFreezeCheck();
                playerQualityCheck();
                processSettings_schedule();
                periodicCheckClaimBonus();
                this.site.children.chat.ChatContainer.on('mount', processSettings_schedule, this);
                this.site.children.chat.ChatContainer.on('set', processSettings_schedule, this);
            }
        }
        FFZEnhancingAddOn.register('ffz-enhancing-addon');
    }


    function checkExistance(attempts) {
        if (window.FrankerFaceZ) {
            main_init();
        } else {
            const newAttempts = (attempts || 0) + 1;
            if (newAttempts < 60)
                return setTimeout(checkExistance.bind(this, newAttempts), 1000);
            console.warn(`[FFZ:FFZ Enhancing Add-On] Could not find FFZ. Injection unsuccessful. (Host: ${window.location.host})`);
        }
    }


    if (/^(?:player|im|chatdepot|tmi|api|spade|api-akamai|dev|)\./.test(window.location.hostname)) return;
    setTimeout(checkExistance, 1000);
})();
