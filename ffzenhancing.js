'use strict';
(() => {
    let version = '6.60';
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
    let ffzenhancing_auto_check_player_compressor;
    let ffzenhancing_pin_mentions;
    let ffzenhancing_reset_after_delay;
    let ffzenhancing_reset_after_delay_delay;
    let ffzenhancing_animate_static_gif_emotes_on_mouse_hover;
    let ffzenhancing_auto_click_claim_bonus_points;
    let ffzenhancing_fix_emote_select;
    let ffzenhancing_highlight_user_messages;
    let ffzenhancing_visibility_hook_time;
    let timeoutPeriodicCheckVideoInfo = 0;
    let handlers_already_attached = {};
    let timers = {};
    let timeoutShowCard;
    let ignore_next_event = false;
    let current_player_volume;
    let current_player_muted;
    let current_player_quality;
    let added_styles = {};
    let visibility_hook_enabled = false;
    let orig_visibilityStateProc;
    let visibility_hook_timeout;
    let resetPlayerTimeout = false;
    let compressPlayerWanted;
    let currentPlayerUserPaused = false;
    let prev_player_onStateChanged;
    let added_message_highlights = {};
    let playbackRate_set_by_us = false;
    let orig_playbackRate_set;


    function getPropertyDescriptor(o, p) {
        let desc;
        do {
            desc = Object.getOwnPropertyDescriptor(o, p);
            o = Object.getPrototypeOf(o);
        } while(!desc);
        return desc;
    }
    Object.prototype.__mylookupGetter__ = function(p, return_set) {
        let desc = getPropertyDescriptor(this, p);
        return desc ? (return_set ? desc.set : desc.get) : undefined;
    };
    Object.defineProperty(Object.prototype, '__mylookupGetter__', {enumerable: false});


    function replaceFunctions() {
        ffz.site.children.chat.ChatBuffer.ready((cls, instances) => {
            const t = ffz.site.children.chat;
            const old_mount = cls.prototype.componentDidMount;

            cls.prototype.componentDidMount = function() {
                setTimeout(() => {
                    try {
                        this.__ffz_enhancingInstall();
                    } catch {}
                }, 1000);
                return old_mount.call(this);
            };

            cls.prototype.__ffz_enhancingInstall = function() {
                if (this.__ffz_enhancing_installed)
                    return;
                this.__ffz_enhancing_installed = true;

                const inst = this;
                const handler = inst.props.messageHandlerAPI;
                if (handler) {
                    if (inst.handleMessage === undefined) {                            
                        handler.addMessageHandler(my_handleMessage);
                    } else {
                        const orig_handleMessage = inst.handleMessage;
                        handler.removeMessageHandler(orig_handleMessage);
                        handler.addMessageHandler(my_handleMessage);
                        handler.addMessageHandler(orig_handleMessage);
                    }
                }
                
                function my_handleMessage(msg) {
                    if (msg) {
                        try {
                            const types = t.chat_types || {};
                            const mod_types = t.mod_types || {};
                            if (msg.type === types.Moderation && inst.unsetModeratedUser) {
                                if (inst.props.isCurrentUserModerator)
                                    return;
                                const user = msg.userLogin;
                                if (inst.moderatedUsers.has(user))
                                    return;
                                const mod_action = msg.moderationType;
                                let new_action;
                                if (mod_action === mod_types.Ban)
                                    new_action = 'ban';
                                else if (mod_action === mod_types.Delete)
                                    new_action = 'delete';
                                else if (mod_action === mod_types.Unban)
                                    new_action = 'unban';
                                else if (mod_action === mod_types.Timeout)
                                    new_action = 'timeout';
                                if (new_action)
                                    msg.moderationActionType = new_action;
                                inst.moderateBuffers([
                                    inst.buffer,
                                    inst.delayedMessageBuffer.map(e => e.event)
                                ], user, msg);
                                inst.delayedMessageBuffer.push({
                                    event: msg,
                                    time: Date.now(),
                                    shouldDelay: false
                                });
                            }
                        } catch {}
                    }
                }
            };

            for (const inst of instances) {
                try {
                    inst.__ffz_enhancingInstall();
                } catch {}
            }
        });        
    }


    function new_onStateChanged(e) {
        try {
            if (e === "Idle") {
                currentPlayerUserPaused = this.paused;
            } else {
                currentPlayerUserPaused = false;
            }
            prev_player_onStateChanged.call(this, e);
        } catch {}
    }


    function playerMount() {
        try {
            if (ffz.site.children.player.current.core.onStateChanged === new_onStateChanged) return;
            prev_player_onStateChanged = ffz.site.children.player.current.core.onStateChanged;
            ffz.site.children.player.current.core.onStateChanged = new_onStateChanged;
        } catch {}
    }


    function getElementByXpath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }


    function visibilityStateHookProc() {
        if (visibility_hook_enabled) return 'visible';
        return orig_visibilityStateProc();
    }

    
    function hiddenHookProc() {
        if (document.pictureInPictureElement != null) return false;
        return document.visibilityState === 'hidden';
    }    


    function enableVisibilityHook() {
        clearTimeout(visibility_hook_timeout);
        visibility_hook_timeout = setTimeout(disableVisibilityHook, ffzenhancing_visibility_hook_time * 1000);
        visibility_hook_enabled = true;
    }


    function disableVisibilityHook() {
        clearTimeout(visibility_hook_timeout);
        visibility_hook_enabled = false;
    }


    function playbackRateSetHook(rate) {
        try {
            if (ffzenhancing_keep_delay_low && !playbackRate_set_by_us && ffz.site.router.current.name == 'user') return rate;
        } catch {}
        return orig_playbackRate_set.call(this, rate);
    };


    function highlightMessage(username) {
        const style = addStyleToSite('highlight_' + username, `
            .ffz-notice-line[data-user="${username}"],
            .chat-line__message:not(.chat-line--inline)[data-user="${username}"] {
                background-color: #a50000;
            }
        `);
        if (style) added_message_highlights[username] = style;
    }


    function removeAllHighlightedMessages() {
        for (const username in added_message_highlights) {
            removeStyleFromSite('highlight_' + username);
            delete added_message_highlights[username]
        }
    }


    function addStyleToSite(style_id, style_text) {
        if (added_styles[style_id]) return;
        let style = document.createElement('style');
        style.textContent = style_text;
        document.body.appendChild(style);
        added_styles[style_id] = style;
        return style;
    }


    function removeStyleFromSite(style_id) {
        if (!added_styles[style_id]) return;
        document.body.removeChild(added_styles[style_id]);
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
        if (orig_visibilityStateProc() !== 'hidden') document.querySelector('link[rel="icon"]').href = notify_icon_original;
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
        //ffz.emit('site.player:reset');
        try {
            ffz.site.children.player.resetPlayer(ffz.site.children.player.current);
            setTimeout(playerCompressorCheck, 1000);
        } catch {}
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
            el.classList.contains('chat-line__message-mention') && !el.classList.contains('ffz-i-threads') ||
            el.parentNode.matches('span.chatter-name[role="button"]') ||
            (el.classList.contains('tw-link') && el.parentNode.parentNode.parentNode.parentNode.classList.contains('viewer-card-header__display-name')) // chatter name link in viewer card
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
            return true;
        }
        return false;
    }


    function getVideoLiveAndNotPaused() {
        try {
            const video = ffz.site.children.player.current.core.mediaSinkManager.video;
            if (video) {
                let broadcast_id;
                if (ffz.site.router.current.name != 'user') return false;
                broadcast_id = ffz.site.children.player.current.getSessionData()['BROADCAST-ID'];
                if (broadcast_id !== undefined && !Number.isNaN(broadcast_id)) { // broadcast_id is NaN when user was offline or in vod, preventing endless refreshes
                    if (!currentPlayerUserPaused) {
                        return video;
                    }
                }
            }
        } catch {}
        return false;
    }


    function playerQualityCheck() {
        if (!ffzenhancing_auto_check_player_quality) return;
        if (timers['playerQualityCheck']) {
            clearTimeout(timers['playerQualityCheck']);
        }
        if (document.visibilityState !== 'hidden') {
            try {
                let def_quality = JSON.parse(window.localStorage.getItem('video-quality')).default;
                let cur_quality = ffz.site.children.player.current.getQuality();
                if (def_quality != cur_quality.group) {
                    let new_quality = ffz.site.children.player.current.getQualities().find(q => q.group == def_quality);
                    if (!new_quality) {
                        let height_def = def_quality.substring(0, def_quality.indexOf('p'));
                        let height_cur = cur_quality.height;
                        if (height_def && height_def != height_cur) {
                            new_quality = ffz.site.children.player.current.getQualities().find(q => q.height <= height_def);
                        }
                    }
                    if (new_quality && new_quality.group != cur_quality.group) {
                        ffz.site.children.player.current.setQuality(new_quality);
                    }
                }
            } catch {}
        }
        timers['playerQualityCheck'] = setTimeout(playerQualityCheck, 5000);
    }


    function compressPlayerChange() {
        try {
            let video = getVideoLiveAndNotPaused();
            if (video) compressPlayerWanted = !video._ffz_compressed;
        } catch {}
    }


    function playerCompressorCheck() {
        if (!ffzenhancing_auto_check_player_compressor) return;
        if (timers['playerCompressorCheck']) {
            clearTimeout(timers['playerCompressorCheck']);
        }

        try {
            let btn = ffz.site.children.player.Player.first.props.containerRef.querySelector('.ffz--player-comp button');
            if (!btn.__ffz_enhancing_installed) {
                btn.addEventListener('click', compressPlayerChange, true);
                btn.__ffz_enhancing_installed = true;
            }
        } catch {}

        try {
            let video = getVideoLiveAndNotPaused();
            if (video && compressPlayerWanted !== undefined && compressPlayerWanted !== !!video._ffz_compressed) {
                ffz.site.children.player.compressPlayer.call(ffz.site.children.player, ffz.site.children.player.Player.first, document.createEvent('Event'));
            }
        } catch {}
        timers['playerCompressorCheck'] = setTimeout(playerCompressorCheck, 5000);
    }    


    function error_2000_check() {
        if (!ffzenhancing_auto_reload_on_error_2000) {
            if (timers['error_2000_check']) {
                clearInterval(timers['error_2000_check']);
                delete timers['error_2000_check'];
            }
            return;
        }

        if (!currentPlayerUserPaused) {
            for (const el of document.querySelectorAll('[data-a-target="player-overlay-content-gate"]')) {
                if (el.textContent.includes('#1000') || el.textContent.includes('#2000') || el.textContent.includes('#3000') || el.textContent.includes('#4000') || el.textContent.includes('#5000')) {
                    ffzResetPlayer();
                    break;
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
        playbackRate_set_by_us = true;
        video.playbackRate = ffzenhancing_keep_delay_low_rate;
        playbackRate_set_by_us = false;
        ffzenhancing_keep_delay_low_latency_was_changed = true;
    }


    function resetPlayerPlaybackSpeed(video) {
        if (ffzenhancing_keep_delay_low_latency_was_changed) {
            playbackRate_set_by_us = true;
            video.playbackRate = 1;
            playbackRate_set_by_us = false;
            ffzenhancing_keep_delay_low_latency_was_changed = false;
        }
    }


    function periodicCheckVideoInfo() {
        const video = getVideoLiveAndNotPaused();
        if (video) {
            let liveLatency;
            try {
                liveLatency = (ffz.site.children.player.current.core && ffz.site.children.player.current.core.state && ffz.site.children.player.current.core.state.liveLatency)
                    || (ffz.site.children.player.current.stats && ffz.site.children.player.current.stats.broadcasterLatency)
                    || (ffz.site.children.player.current.core && ffz.site.children.player.current.core.stats && ffz.site.children.player.current.core.stats.broadcasterLatency);
            } catch {}
            if (liveLatency !== undefined) {
                if (ffzenhancing_reset_after_delay) {
                    if (liveLatency > ffzenhancing_reset_after_delay_delay) {
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
                    if (liveLatency > delay) {
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
        if (button && orig_visibilityStateProc() === 'visible') button.click();
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
                el = document.querySelector('.stream-chat-header button[data-test-selector="chat-viewer-list"]');
                appendEl = document.querySelector('.chat-input__buttons-container > div:first-child');
            } else {
                el = document.querySelector('.chat-input__buttons-container button[data-test-selector="chat-viewer-list"]');
                appendEl = document.querySelector('.stream-chat-header > div:last-child');
            }
            if (el && appendEl) {
                el = el.parentNode;
                el.parentNode.removeChild(el);
                appendEl.prepend(el);

                if (ffzenhancing_move_users_in_chat_to_bottom) {
                    addStyleToSite('ffzenhancing_move_users_in_chat_to_bottom', `
                        [data-test-selector="chat-input-buttons-container"] .tw-balloon[role="dialog"] {
                            margin-left: -30px;
                        }
                    `);
                } else {
                    removeStyleFromSite('ffzenhancing_move_users_in_chat_to_bottom');
                }

                let tooltip = el.querySelector('.tw-tooltip');
                if (tooltip && tooltip.id) {
                    if (ffzenhancing_move_users_in_chat_to_bottom) {
                        addStyleToSite('ffzenhancing_move_users_in_chat_to_bottom_tooltip', `
                            [id="${tooltip.id}"] {
                                top: unset;
                                bottom: 100%;
                                margin-top: unset;
                                margin-bottom: 6px;
                            }

                            [id="${tooltip.id}"]::after {
                                top: unset;
                                bottom: -3px;
                            }
                        `);
                    } else {
                        removeStyleFromSite('ffzenhancing_move_users_in_chat_to_bottom_tooltip');
                    }
                }
            }
        }

        // ffzenhancing_hide_rooms_header
        if (!window.location.href.endsWith('/squad')) {
            el = document.querySelector('.stream-chat-header');
            if (el) {
                if (ffzenhancing_hide_rooms_header) {
                    addStyleToSite('ffzenhancing_hide_rooms_header', `
                        .stream-chat-header {
                            display: none !important;
                        }
                        button[data-a-target="chat-viewer-list"][aria-label="Close"] {
                            margin-left: 30px;
                        }
                        .chat-input__buttons-container .tw-align-items-center .tw-mg-r-1 {
                            height: 30px;
                        }
                    `);
                } else {
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

        // ffzenhancing_fix_emote_select
        if (ffzenhancing_fix_emote_select) {
            addStyleToSite('ffzenhancing_fix_emote_select', '.ffz--inline {display: inline-block;}');
        } else {
            removeStyleFromSite('ffzenhancing_fix_emote_select');
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
                                        if (!cloned_chat_line.querySelector('.chat-line__timestamp')) {
                                            let ts = document.createElement('span');
                                            ts.classList.add('chat-line__timestamp');
                                            ts.textContent = (new Date()).toLocaleTimeString(window.navigator.userLanguage || window.navigator.language, {
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            });
                                            cloned_chat_line.prepend(ts);
                                        }
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
                                        if (orig_visibilityStateProc() === 'hidden') document.querySelector('link[rel="icon"]').href = notify_icon;
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
        if (!handlers_already_attached['playbackrate_handler']) {
            handlers_already_attached['playbackrate_handler'] = true;

            orig_playbackRate_set = HTMLVideoElement.prototype.__mylookupGetter__('playbackRate', true);
            if (orig_playbackRate_set !== undefined) {
                if (orig_playbackRate_set !== playbackRateSetHook) {
                    try {
                        Object.defineProperty(HTMLVideoElement.prototype, 'playbackRate', {
                            set: playbackRateSetHook,
                            get: HTMLVideoElement.prototype.__mylookupGetter__('playbackRate')
                        });
                    } catch {}
                }
            }
        }
        if (!handlers_already_attached['visibilitychange_handler']) {
            handlers_already_attached['visibilitychange_handler'] = true;

            orig_visibilityStateProc = document.__mylookupGetter__('visibilityState');            
            if (orig_visibilityStateProc !== undefined) {
                orig_visibilityStateProc = orig_visibilityStateProc.bind(document);
                if (document.__mylookupGetter__('visibilityState') !== visibilityStateHookProc) {
                    try {
                        Object.defineProperty(document, 'visibilityState', {
                            configurable: true,
                            get: visibilityStateHookProc
                        });
                    } catch {}
                }
                if (document.__mylookupGetter__('hidden') !== hiddenHookProc) {
                    try {
                        Object.defineProperty(document, 'hidden', {
                            configurable: true,
                            get: hiddenHookProc
                        });
                    } catch {}
                }
            } else {
                orig_visibilityStateProc = () => {
                    return document.visibilityState;
                };
            }

            let skip = false;
            window.addEventListener('visibilitychange', () => {
                if (!skip) {
                    if (orig_visibilityStateProc() === 'hidden') {
                        enableVisibilityHook();
                        setTimeout(() => {
                            skip = true;
                            document.dispatchEvent(new Event('visibilitychange'));
                        }, ffzenhancing_visibility_hook_time * 1000 + 1000);
                    } else if (orig_visibilityStateProc() === 'visible') {
                        disableVisibilityHook();
                    }
                }
                skip = false;
            }, true);
        }
        if (!handlers_already_attached['reset_player_click_handler']) {
            handlers_already_attached['reset_player_click_handler'] = true;
            document.body.addEventListener('click', e => {
                if (e.target.classList.contains('ffz-i-t-reset-clicked') || e.target.classList.contains('ffz-i-t-reset')) {
                    let compressed;
                    let video = getVideoLiveAndNotPaused();
                    if (video) compressed = video._ffz_compressed;
                    if (video && compressed !== undefined) {
                        if (resetPlayerTimeout) clearTimeout(resetPlayerTimeout);
                        resetPlayerTimeout = setTimeout(function compRestore(c = 0) {
                            let video = getVideoLiveAndNotPaused();
                            if (!video && c < 10) return resetPlayerTimeout = setTimeout(() => compRestore(c + 1), 500);
                            if (video && compressed !== !!video._ffz_compressed) ffz.site.children.player.compressPlayer(ffz.site.children.player.Player.first, document.createEvent('Event'));
                        }, 500);
                    }
                }
            });
        }
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
                        if (el) el.parentNode.removeChild(el);
                        el = document.querySelector('.tw-tooltip-layer');
                        if (el) el.parentNode.removeChild(el);
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

                        if (ffzenhancing_highlight_user_messages) {
                            let clicked_username = e.target.innerText.toLowerCase();
                            if (clicked_username.startsWith('@'))
                                clicked_username = clicked_username.substr(1);
                            setTimeout(() => {
                                let card = document.querySelector('[data-a-target="viewer-card"]');
                                if (card) {
                                    highlightMessage(clicked_username);
                                    let card_close = card.querySelector('[data-a-target="viewer-card-close-button"]');
                                    if (card_close) {
                                        card_close.addEventListener('click', () => {
                                            removeAllHighlightedMessages();
                                        });
                                    }
                                }
                            }, 500);
                        }

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
                            if (isNaN(val) || !isFinite(val)) val = 30;
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
                        title: 'Fix Hanged Tooltips',
                        description: 'Hide hanged tooltips on mouse click.',
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
                        description: 'Periodically check if "Claim Bonus Points" button is available and click it if tab is active.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_click_claim_bonus_points = val;
                        periodicCheckClaimBonus();
                    }
                });
                this.settings.add('ffzenhancing.fix_emote_select', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Fix emotes select',
                        description: 'Fix emotes select when trying to select emotes in chat line.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_fix_emote_select = val;
                        processSettings();
                    }
                });
                this.settings.add('ffzenhancing.highlight_user_messages', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Other Settings',
                        title: 'Highlight selected user messages',
                        description: 'Highlight messages of the user after username was clicked in chat.',
                        component: 'setting-check-box',
                    },
                    changed: val => ffzenhancing_highlight_user_messages = val
                });


                // Player
                this.settings.add('ffzenhancing.auto_reload_on_error_2000', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Reload on Errors #1000, #2000, #3000, #4000 or #5000',
                        description: 'Reload player automatically when network errors #1000, #2000, #3000, #4000 or #5000 happen.',
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
                            if (val < 2) val = 2;
                            if (val > 20) val = 20;
                            return val;
                        }
                    },
                    changed: val => {
                        ffzenhancing_auto_reload_on_hanged_video_after = val;
                        playerFreezeCheck();
                    }
                });
                this.settings.add('ffzenhancing.auto_check_player_compressor', {
                    default: false,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Auto Check Player Compressor Status',
                        description: 'Reset compressor status to last used if different status detected.',
                        component: 'setting-check-box',
                    },
                    changed: val => {
                        ffzenhancing_auto_check_player_compressor = val;
                        playerCompressorCheck();
                    }
                });
                this.settings.add('ffzenhancing.visibility_hook_time', {
                    default: 5,
                    ui: {
                        path: 'Add-Ons > FFZ Enhancing Add-On >> Player',
                        title: 'Visibility Hook Time',
                        description: 'Delay before visibility hook deactivation.',
                        component: 'setting-text-box',
                        process: val => {
                            val = parseFloat(val);
                            if (isNaN(val) || !isFinite(val)) val = 5;
                            if (val < 5) val = 5;
                            if (val > 600) val = 600;
                            return val;
                        }
                    },
                    changed: val => ffzenhancing_visibility_hook_time = val
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
                ffzenhancing_auto_check_player_compressor = this.settings.get('ffzenhancing.auto_check_player_compressor');
                ffzenhancing_pin_mentions = this.settings.get('ffzenhancing.pin_mentions');
                ffzenhancing_reset_after_delay = this.settings.get('ffzenhancing.reset_after_delay');
                ffzenhancing_reset_after_delay_delay = this.settings.get('ffzenhancing.reset_after_delay_delay');
                ffzenhancing_animate_static_gif_emotes_on_mouse_hover = this.settings.get('ffzenhancing.animate_static_gif_emotes_on_mouse_hover');
                ffzenhancing_auto_click_claim_bonus_points = this.settings.get('ffzenhancing.auto_click_claim_bonus_points');
                ffzenhancing_fix_emote_select = this.settings.get('ffzenhancing.fix_emote_select');
                ffzenhancing_highlight_user_messages = this.settings.get('ffzenhancing.highlight_user_messages');
                ffzenhancing_visibility_hook_time = this.settings.get('ffzenhancing.visibility_hook_time');
                schedulePeriodicCheckVideoInfo();
                setupHandlers();
                error_2000_check();
                playerFreezeCheck();
                playerQualityCheck();
                playerCompressorCheck();
                processSettings_schedule();
                periodicCheckClaimBonus();
                replaceFunctions();
                this.site.children.chat.ChatContainer.on('mount', processSettings_schedule, this);
                this.site.children.chat.ChatContainer.on('set', processSettings_schedule, this);
                this.site.children.player.PlayerSource.on('update', playerMount, this);
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
