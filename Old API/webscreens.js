/*******************************************************************************
 *
 * Copyright (c) 2013 Louay Bassbouss, Fraunhofer FOKUS, All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.0 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library. If not, see <http://www.gnu.org/licenses/>.
 *
 * AUTHORS: Louay Bassbouss (louay.bassbouss@fokus.fraunhofer.de)
 *
 ******************************************************************************/
(function(window,ns,delegate,undefined){
	var utils = ns.utils || {};
	var requestSession = function(url,options){
		var absUrl = null;
		try{absUrl = new URL(url,location.href).href; }catch(e){}
		if(!absUrl){
			absUrl = utils.qualifyURL(url);
		}
		if (!absUrl) {
			absUrl = url;
		};
		var delSession = delegate.requestSession(absUrl,options);
		var session = new PresentationSession(delSession);
		return session;
	};


	/*
	 * https://www.w3.org/community/webscreens/wiki/API_Discussion#NavigatorPresentation_interface
	 */
	var NavigatorPresentation = function(){
		var onavailablechange = null;
		var onpresent = null;
		Object.defineProperty(this, "onavailablechange", {
			get: function () {
				return onavailablechange;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onavailablechange = value;
					if (onavailablechange) {
						delegate.onavailablechange = function(dict){
							var evt = new AvailableChangeEvent("availablechange",dict);
							onavailablechange.call(null,evt);
						};
					}
					else {
						delegate.onavailablechange = null;
					}
				};
			}
		});
		Object.defineProperty(this, "onpresent", {
			get: function () {
				return onpresent;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onpresent = value;
					if (onpresent) {
						delegate.onpresent = function(delSession){
							var session = new PresentationSession(delSession);
                            var evt = new PresentEvent('PresentEvent',{session: session})
							//onpresent.call(null,session);
                            onpresent.call(null,evt);
						};
					}
					else {
						delegate.onpresent = null;
					}
				};
			}
		});
	};
	//NavigatorPresentation.prototype = EventTarget.prototype;
	Object.defineProperty(NavigatorPresentation.prototype,"requestSession",{
		get: function () {
			return requestSession;
		}
	});

	/*
	 * https://www.w3.org/community/webscreens/wiki/API_Discussion#AvailableChangeEvent_interface
	 */
	var AvailableChangeEvent = function(type, eventInitDict){
		this.type = type;
		var available = eventInitDict && eventInitDict.available == true;
		Object.defineProperty(this, "available", {
			get: function () {
				return available;
			}
		});
	};

	AvailableChangeEvent.prototype = Event.prototype;
	/*
	 * https://www.w3.org/community/webscreens/wiki/API_Discussion#PresentEvent_interface
	 */
	var PresentEvent = function(type,eventInitDict){
		this.type = type;
		var session = eventInitDict && (eventInitDict.session || null);
		Object.defineProperty(this, "session", {
			get: function () {
				return session;
			}
		});
	};
	/*
	 * https://www.w3.org/community/webscreens/wiki/API_Discussion#PresentationSession_interface
	 */
	var CONNECTED = "connected";
	var DISCONNECTED = "disconnected";
	var RESUMED = "resumed";
	var PresentationSessionState = [CONNECTED,DISCONNECTED,RESUMED];
	var PresentationSession = function(delSession){
		var onmessage = null;
		var onstatechange = null;
		var self = this;
		delSession.onstatechange = function(){
			if (typeof onstatechange == "function") {
				onstatechange.call(null);
			};
		};
		delSession.onmessage = function(msg){
			if (typeof onmessage == "function") {
				onmessage.call(null,msg);
			};
		};
		Object.defineProperty(this, "state", {
			get: function () {
				return (delSession && delSession.state) || null;
			}
		});
		Object.defineProperty(this, "onmessage", {
			get: function () {
				return onmessage;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onmessage = value;
				};
			}
		});
		Object.defineProperty(this, "onstatechange", {
			get: function () {
				return onstatechange;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onstatechange = value;
				};
			}
		});

		Object.defineProperty(this, "postMessage", {
			get: function () {
				return function(msg){
					return delSession.postMessage(msg);
				};
			}
		});

		Object.defineProperty(this, "close", {
			get: function () {
				return function(){
					return delSession.close();
				};
			}
		});
	}
	//PresentationSession.prototype = EventTarget.prototype;
	/*
	 *
	 */
	var presentation = new NavigatorPresentation();
	Object.defineProperty(window.navigator, "presentation", {
		get: function () {
			return presentation;
		}
	});
})(window, window.famium =  window.famium || {},(function(ns,io,undefined){
	var utils = ns.utils || {};
    var params = utils.parseHash(location.hash);
	var sessions = {};
	var displays = {};
    var presentations = {};
	var CONNECTED = "connected";
	var DISCONNECTED = "disconnected";
	var RESUMED = "resumed";
	var socket = null;
    var filterPresentations = function(url){
        var result = new Object();
        if(url){
            for(var key in presentations){
                var presentation = presentations[key];
                if(presentation && presentation.url == url){
                    result[key] = presentation;
                }
            }
        }
        return result;
    };
	var promptDisplayPicker = function(url){
		var options = {};
		var counter = 1;
        var msg = "";
        msg += Object.keys(displays).length?"Available Displays:\n":"";
		for(var key in displays){
			var display = displays[key];
			//msg += "   ["+counter+"] "+display.name+"\n";
			msg += "   ["+counter+"] "+display.name+"  ";
			options[counter++] = {
                type: "display",
                key: key
            };
		}
        var presentations = filterPresentations(url);
        msg += Object.keys(presentations).length?"\nAvailable Running Presentations:\n":"";
        for(var key in presentations){
            var presentation = presentations[key];
            //msg += "   ["+counter+"] "+display.name+"\n";
            msg += "   ["+counter+"] "+presentation.name+"  ";
            options[counter++] = {
                type: "presentation",
                key: key
            };
        }

		msg += "\n\nPlease enter option e.g. 1";
		var result = {};
		if(counter == 1){
			alert("No Displays or Presentations available");
		}
		else if(counter == 2) {
            var option = options[1];
			var key = option && option.key;
            var type = option && option.type;
            var confirmMsg = "";
            if(type == "display"){
                result.display = key && displays[key] || null;
                confirmMsg = "Present on Display '"+result.display.name+"'?";
            }
            else if(type == "presentation"){
                result.presentation = key && presentations[key] || null;
                confirmMsg = "Join Presentation '"+result.presentation.name+"'?";
            }
			if (result && !confirm(confirmMsg)) {
                result = null;
			}
		}
		else {
			var i = prompt(msg);
			var option = options[i];
            var key = option && option.key;
            var type = option && option.type;
            if(key && type == "display"){
                result.display = displays[key] || null;
            }
            else if(key && type == "presentation"){
                result.presentation = presentations[key] || null;
            }
            else{
                result = null;
            }
		}
		return result;
	};
	var NavigatorPresentation = function(){
		var onpresent = null;
		var onavailablechange = null;
		//this.onpresent = null;
		this.session = null;
		var self = this;
		Object.defineProperty(this, "onpresent", {
			get: function () {
				return onpresent;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onpresent = value;
					if (onpresent && self.session != null) {
						var delSession = self.session;
						self.session = null;
						onpresent.call(null,delSession);
					};
				};
			}
		});
		Object.defineProperty(this, "onavailablechange", {
			get: function () {
				return onavailablechange;
			},
			set: function(value){
				if (typeof value == "function" || value == null) {
					onavailablechange = value;
					if (onavailablechange) {
                        //var presentations = filterPresentations();
						onavailablechange.call(null,Object.keys(displays).length + Object.keys(presentations).length> 0);
					};
				};
			}
		});

	};
	NavigatorPresentation.prototype.requestSession = function(url,options){
		var session = new PresentationSession();
		session.state = DISCONNECTED;
		session.id = Math.random().toString(36).substring(2);
		session.sender = "";
		session.receiver = "";
		session.url = url;
		sessions[session.id] = session;
        var selection = null;
        if(options && (options.presentationId || options.displayId)){
            selection = {
                display: (options.displayId && {id: options.displayId}) || null,
                presentation: (options.presentationId && {id: options.presentationId}) || null
            };
        }
        else {
            var selection = promptDisplayPicker(url);
        }
        if(selection){
            session.display = selection.display || null;
            session.presentation = selection.presentation || null;
			socket && socket.emit("requestSession",session);
        }
		else{
			setTimeout(function(){
				session.onstatechange && session.onstatechange.call(null);
			}, 500);
		}
		return session;
	};

	var PresentationSession = function(){
		this.onstatechange = null;
		this.onmessage = null;
		this.id = null;
		this.state = null;
		this.sender = null;
		this.receiver = null;
		this.room = null;
	};
	PresentationSession.prototype.postMessage = function(msg){
		var target = this.sender || this.receiver || null;
		if (this.state == CONNECTED && target != null) {
			socket && socket.emit("postMessage",{
				msg: msg,
				session: this.id,
				target: target
			});
		};
	};
	PresentationSession.prototype.close = function(localOnly){
		var target = this.sender || this.receiver || null;
		if(target && localOnly != true){
			socket && socket.emit("closeSession",{
				session: this.id,
				target: target
			});
		}
		if(sessions[this.id]){
			delete sessions[this.id];
			this.state = DISCONNECTED;
			if (typeof this.onstatechange == "function") {
				this.onstatechange.call(null);
			};
		}
	};

	var delegate = new NavigatorPresentation();
	delegate.ready = false;

    ns.webscreens = {
        join: function(room,name){
			socket && socket.emit("join",{
                room: room,
				name: name,
				url: location.href.split("#")[0]
            });
			return socket != null;
        },
        leave: function(room){
			socket && socket.emit("leave",{
                room: room
            });
			return socket != null;
        },
        prompt: function(options, callback){

        },
        params: params,
        displays: displays,
        presentations: presentations,
        id: null,
		onjoinroom: null,
		onleaveroom: null,
		onadddisplay: null,
		onremovedisplay: null,
		onaddpresentation: null,
		onremovepresentation: null
    };
	ns.webscreens.connect = function (config,callback) {
		callback = typeof config == "function"?config:callback;
		callback = typeof callback == "function"?callback:null;
		config = typeof config == "object"?config:{};
		if(socket) return false;
		socket = io.connect(utils.HOST+"/",config);
		socket.on("ready",function(data){
			delegate.ready = true;
			ns.webscreens.id = data && data.id || null;
			callback && callback();
		});
		socket.on("joined",function(data){
			//delegate.ready = true;
			var count = Object.keys(displays).length + Object.keys(presentations).length;
			var add = false;
			for (var i = 0; i < data.displays.length; i++) {
				var display = data.displays[i];
				displays[display.id] = display;
				add =  true;
			};
			for (var i = 0; i < data.presentations.length; i++) {
				var presentation = data.presentations[i];
				presentations[presentation.id] = presentation;
				add =  true;
			};
			if (count == 0 && add && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: true
				});
			};
			(typeof ns.webscreens.onjoinroom == "function") && ns.webscreens.onjoinroom(data);
		});
		socket.on("left",function(data){
			var count = Object.keys(displays).length + Object.keys(presentations).length;
			for (var i = 0; i < data.displays.length; i++) {
				var display = data.displays[i];
				delete displays[display.id];
			};
			for (var i = 0; i < data.presentations.length; i++) {
				var presentation = data.presentations[i];
				delete presentations[presentation.id];
			};
			var count1 = Object.keys(displays).length + Object.keys(presentations).length;
			if (count > 0 && count1 == 0 && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: false
				});
			};
			(typeof ns.webscreens.onleaveroom == "function") && ns.webscreens.onleaveroom(data);
		});
		socket.on("reconnect",function(data){
			delegate.ready = true;
		});
		socket.on("disconnect",function(){
			delegate.ready = false;
		});
		socket.on("error",function(){
			delegate.ready = false;
		});
		socket.on("display_added",function(data){
			var count = Object.keys(displays) + Object.keys(presentations).length;
			displays[data.id] = data;
			if (count == 0 && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: true
				});
			};
			(typeof ns.webscreens.onadddisplay == "function") && ns.webscreens.onadddisplay(data);
		});
		socket.on("display_removed",function(data){
			var count = Object.keys(displays).length + Object.keys(presentations).length;
			delete displays[data.id];
			var count1 = Object.keys(displays).length + Object.keys(presentations).length;
			if (count >0 && count1 == 0 && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: false
				});
			};
			(typeof ns.webscreens.onremovedisplay == "function") && ns.webscreens.onremovedisplay(data);
		});
		socket.on("presentation_added",function(data){
			var count = Object.keys(displays) + Object.keys(presentations).length;
			presentations[data.id] = data;
			if (count == 0 && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: true
				});
			};
			(typeof ns.webscreens.onaddpresentation == "function") && ns.webscreens.onaddpresentation(data);
		});
		socket.on("presentation_removed",function(data){
			var count = Object.keys(displays).length + Object.keys(presentations).length;
			delete presentations[data.id];
			var count1 = Object.keys(displays).length + Object.keys(presentations).length;
			if (count >0 && count1 == 0 && typeof delegate.onavailablechange == "function") {
				delegate.onavailablechange.call(null, {
					available: false
				});
			};
			(typeof ns.webscreens.onremovepresentation == "function") && ns.webscreens.onremovepresentation(data);
		});
		socket.on("sessionConnected",function(data){
			var sessionId = data.id;
			var delSession = sessions[sessionId];
			if (delSession) {
				//delSession.sender =  data.sender;
				delSession.receiver = data.receiver;
				delSession.state = CONNECTED;
				if (typeof delSession.onstatechange == "function") {
					delSession.onstatechange.call(null);
				};
			};
		});
		socket.on("postMessage",function(data){
			var sessionId = data.session;
			var msg = data.msg;
			var delSession = sessions[sessionId];
			if (delSession && typeof delSession.onmessage == "function") {
				delSession.onmessage.call(null,msg);
			};
		});
		socket.on("closeSession",function(data){
			var sessionId = data.session;
			var delSession = sessions[sessionId];
			if (delSession) {
				delSession.close(true);
			};
		});
		socket.on("clientDisconnected",function(data){
			var id = data.id;
			for(var i in sessions){
				var delSession = sessions[i];
				if(delSession.sender == id || delSession.receiver == id){
					delSession.close(true);
				}
			}
		});
		socket.on("requestSession",function(data){
			var sessionId = data.id || null;
			var sender = data.sender || null;
			if(sender && sessionId){
				var delSession = new PresentationSession();
				delSession.id = sessionId;
				delSession.sender = sender;
				delSession.state = CONNECTED;
				sessions[delSession.id] = delSession;
				socket.emit("sessionConnected",delSession);
				if (typeof delegate.onpresent == "function") {
					delegate.onpresent.call(null,delSession);
				}
			}
		});
		return true;
	};

	var name = params.name || null;
	var room = params.room || null;
	var sender = params.sender || null;
	var sessionId = params.session || null;
	var chromecast = params.chromecast == "1";
	var forceJSONP = params.jsonp == "1";
	if(sender && sessionId || room || chromecast){
		ns.webscreens.connect({forceJSONP: forceJSONP}, function () {
			if ( sender && sessionId) {
				var delSession = new PresentationSession();
				delSession.id = sessionId;
				delSession.sender = sender;
				delSession.state = CONNECTED;
				//delSession.room = room;
				sessions[delSession.id] = delSession;
				socket.emit("sessionConnected",delSession);
				if (typeof delegate.onpresent == "function") {
					delegate.onpresent.call(null,delSession);
				}
				else {
					delegate.session = delSession;
				}
				var oldClose = window.close;
				try{
					window.close = function(){
						try{oldClose();}catch(e){console.error(e)}
						try{top.postMessage("close",location.origin);}catch(e){console.error(e)}
						try{location.replace("about:blank");}catch(e){console.error(e)}
					};
				}
				catch(e){
					console.error("cannot override window.close");
				}
			};
			if (room) {
				socket.emit("join",{
					name: name,
					room: room,
					url: location.href.split("#")[0]
				});
			}/*else {
			 var errorMsg = "room code is missing: Please append '#room=[code]' to the URL of your application e.g."+location.href+"#room=[code].\n\n";
			 errorMsg  += "Please replace [code] with the actual room code showed on the dispaly.";
			 alert(errorMsg);
			 throw errorMsg;
			 }*/
			if(chromecast){
				var ns = "urn:x-cast:de.fhg.fokus.famium";
				var sessionListener = function(sess){
					sess.addMessageListener(ns,function(ns,msg){
						msg = JSON.parse(msg);
						console.log(msg);
						socket.emit("join",msg);
					});
					var msg = JSON.stringify({
						name: sess.receiver && sess.receiver.friendlyName || params.name || "Chromecast",
						room: params.room || null
					});
					sess.sendMessage(ns,msg,function(){
						console.log("message sent");
					},function(err){
						console.error("error on send message",err);
					});
				};
				var receiverListener = function(e){
					console.log("receiverListener",arguments);
				};
				var onInitSuccess = function(){
					console.log("onInitSuccess",arguments);
				};
				var onError = function(){
					console.log("onError",arguments);
				};
				var initializeCastApi = function() {
					var applicationID = "9CA54710";
					var sessionRequest = new chrome.cast.SessionRequest(applicationID);
					var apiConfig = new chrome.cast.ApiConfig(sessionRequest,sessionListener,receiverListener,chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,chrome.cast.DefaultActionPolicy.CREATE_SESSION);
					chrome.cast.initialize(apiConfig, onInitSuccess, onError);
				};
				window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
					if (loaded) {
						initializeCastApi();
					} else {
						console.log(errorInfo);
					}
				}
				var chromecastScript = document.createElement('script');
				chromecastScript.setAttribute('src','//www.gstatic.com/cv/js/sender/v1/cast_sender.js');
				document.head.appendChild(chromecastScript);
			}
		});
	}
	return delegate;
})(window.famium = window.famium || {}, io));