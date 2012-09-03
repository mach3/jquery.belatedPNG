/**
* DD_belatedPNG: Adds IE6 support: PNG images for CSS background-image and HTML <IMG/>.
* Author: Drew Diller
* Email: drew.diller@gmail.com
* URL: http://www.dillerdesign.com/experiment/DD_belatedPNG/
* Version: 0.0.8a
* Licensed under the MIT License: http://dillerdesign.com/experiment/DD_belatedPNG/#license
*
* Example usage:
* DD_belatedPNG.fix('.png_bg'); // argument is a CSS selector
* DD_belatedPNG.fixPng( someNode ); // argument is an HTMLDomElement
**/

/*
PLEASE READ:
Absolutely everything in this script is SILLY.  I know this.  IE's rendering of certain pixels doesn't make sense, so neither does this code!
*/

/**
* jquery.belatedPNG: Adds IE6/7/8 support: PNG images for CSS background-image and HTML <IMG/>.
* Author: Kazunori Ninomiya
* Email: Kazunori.Ninomiya@gmail.com
* Version: 0.0.5b
* Licensed under the MIT License: http://dillerdesign.com/experiment/DD_belatedPNG/#license
*
* Example usage:
* $('.png_bg').fixPng();
**/

(function($) {
	var doc = document;
	var DD_belatedPNG = {
		ns: 'DD_belatedPNG',
		imgSize: {},
		delay: 10,
		nodesFixed: 0,
		createVmlNameSpace: function () {
			if (doc.namespaces && !doc.namespaces[this.ns]) {
				doc.namespaces.add(this.ns, 'urn:schemas-microsoft-com:vml');
			}
		},
		createVmlStyleSheet: function () {
			var firstChild = doc.documentElement.firstChild;
			var screenStyleSheet = doc.createElement('style');
			screenStyleSheet.setAttribute('media', 'screen');
			firstChild.insertBefore(screenStyleSheet, firstChild.firstChild);
			if (screenStyleSheet.styleSheet) {
				var selector = !$.support.opacity && !$.support.style
					? this.ns + '\\:*' : this.ns + '\\:shape, ' + this.ns + '\\:fill';
				screenStyleSheet = screenStyleSheet.styleSheet;
				screenStyleSheet.addRule(selector, 'behavior:url(#default#VML);');
				screenStyleSheet.addRule(this.ns + '\\:shape', 'position:absolute;');
				screenStyleSheet.addRule('img.' + this.ns + '_sizeFinder', [
					'behavior:none',
					'border:none',
					'position:absolute',
					'z-index:-1',
					'top:-10000px',
					'visibility:hidden'
				].join(';'));
				this.screenStyleSheet = screenStyleSheet;

				var printStyleSheet = doc.createElement('style');
				printStyleSheet.setAttribute('media', 'print');
				firstChild.insertBefore(printStyleSheet, firstChild.firstChild);
				printStyleSheet = printStyleSheet.styleSheet;
				printStyleSheet.addRule(selector, 'display: auto !important;');
				printStyleSheet.addRule('img.' + this.ns + '_sizeFinder', 'display: none !important;');
			}
		},
		readPropertyChange: function () {
			var el = event.srcElement;
			if (!el.vmlInitiated) {
				return;
			}
			var propName = event.propertyName;
			if (propName.match(/^onmouse(over|out|enter|leave)$/)) {
				el.vml.image.shape[propName] = function() {
					el[propName]();
				};
			}
			if ((el.isImg && propName == 'width' || propName == 'height')
				|| propName == 'style.width' || propName == 'style.height') {
				DD_belatedPNG.vmlSize(el);
			}
			if ((el.isImg && propName == "src")
				|| propName.search('background') != -1 || propName.search('border') != -1) {
				DD_belatedPNG.applyVML(el);
			}
			if (propName == 'style.display') {
				var display = (el.currentStyle.display == 'none') ? 'none' : '';
				for (var v in el.vml) {
					if (el.vml.hasOwnProperty(v)) {
						el.vml[v].shape.style.display = display;
					}
				}
			}
			if (propName.search('filter') != -1) {
				el.vml.image.fill.color = 'none';
				DD_belatedPNG.vmlOpacity(el);
			}
		},
		vmlOpacity: function (el) {
			if (el.currentStyle.filter.search('lpha') != -1) {
				var trans = el.currentStyle.filter;
				trans = parseInt(trans.substring(trans.lastIndexOf('=') + 1,
					trans.lastIndexOf(')')), 10) / 100;
				el.vml.color.shape.style.filter = el.currentStyle.filter;
				el.vml.image.fill.opacity = trans;
			}
		},
		handlePseudoHover: function (el) {
			setTimeout(function () {
				DD_belatedPNG.applyVML(el);
			}, 1);
		},
		applyVML: function (el) {
			el.runtimeStyle.cssText = '';
			this.vmlFill(el);
			this.copyStyleSheet(el);
			if (el.isImg) {
				this.copyImageBorders(el);
			}
			this.vmlOffsets(el);
			this.vmlSize(el);
			this.vmlOpacity(el);
		},
		attachHandlers: function (el) {
			var self = this;
			var handlers = {resize: 'vmlOffsets', move: 'vmlOffsets'};
			if (el.nodeName == 'A') {
				var moreForAs = {
					mouseleave: 'handlePseudoHover',
					mouseenter: 'handlePseudoHover',
					focus: 'handlePseudoHover',
					blur: 'handlePseudoHover'
				};
				for (var a in moreForAs) {
					if (moreForAs.hasOwnProperty(a)) {
						handlers[a] = moreForAs[a];
					}
				}
			}
			for (var h in handlers) {
				if (handlers.hasOwnProperty(h)) {
					var handler = function () {
						self[handlers[h]](el);
					};
					el.attachEvent('on' + h, handler);
				}
			}

			el.attachEvent('onpropertychange', this.readPropertyChange);
		},
		giveLayout: function (el) {
			if (parseFloat(el.style.zoom) === 0) {
				el.style.zoom = 1;
			}
			if (el.currentStyle.position == 'static') {
				el.style.position = 'relative';
			}
		},
		copyStyleSheet: function(el) {
			var styles = {
				'cursor': true
			};
			for (var s in styles) {
				if (styles.hasOwnProperty(s)) {
					if (s == 'cursor' && el.offsetNode.nodeName == 'A' && el.currentStyle[s] == 'auto') {
						el.vml.image.shape.style[s] = 'pointer';
					}
					else {
						el.vml.image.shape.style[s] = el.currentStyle[s];
					}
				}
			}
		},
		copyImageBorders: function (el) {
			var styles = {
				'borderStyle': true,
				'borderWidth': true,
				'borderColor': true
			};
			// IE6/7 hasLayout bug
			el.offsetNode.style.zoom = '';
			for (var s in styles) {
				if (styles.hasOwnProperty(s)) {
					el.vml.color.shape.style[s] = el.currentStyle[s];
				}
			}
		},
		vmlFill: function (el) {
			if (!el.currentStyle) {
				return;
			}
			var elStyle = el.currentStyle;
			for (var v in el.vml) {
				if (el.vml.hasOwnProperty(v)) {
					el.vml[v].shape.style.zIndex = elStyle.zIndex;
				}
			}
			el.runtimeStyle.backgroundColor = '';
			el.runtimeStyle.backgroundImage = '';
			var noImg = true;
			if (elStyle.backgroundImage != 'none' || el.isImg) {
				if (!el.isImg) {
					el.vmlBg = elStyle.backgroundImage;
					el.vmlBg = el.vmlBg.substr(5, el.vmlBg.lastIndexOf('")') - 5);
				}
				else {
					el.vmlBg = el.src;
				}
				var lib = this;
				if (!lib.imgSize[el.vmlBg]) {
					var img = doc.createElement('img');
					lib.imgSize[el.vmlBg] = img;
					img.className = lib.ns + '_sizeFinder';
					img.runtimeStyle.cssText = [
						'behavior:none',
						'position:absolute',
						'left:-10000px',
						'top:-10000px',
						'border:none',
						'margin:0',
						'padding:0'
					].join(';');
					var imgLoaded = function () {
						this.width  = this.offsetWidth;
						this.height = this.offsetHeight;
						lib.vmlOffsets(el);
					};
					img.attachEvent('onload', imgLoaded);
					img.src = el.vmlBg;
					img.removeAttribute('width');
					img.removeAttribute('height');
					doc.body.insertBefore(img, doc.body.firstChild);
				}
				el.vml.image.fill.src = el.vmlBg;
				noImg = false;
			}
			el.vml.image.fill.on = !noImg;
			el.vml.image.fill.color = 'none';
			el.vml.color.shape.style.backgroundColor = elStyle.backgroundColor;
			el.runtimeStyle.backgroundImage = 'none';
			el.runtimeStyle.backgroundColor = 'transparent';
		},
		vmlOffsets: function (el) {
			var thisStyle = el.currentStyle;
			var size = {
				'W': el.clientWidth  + 1,
				'H': el.clientHeight + 1,
				'w': this.imgSize[el.vmlBg].width,
				'h': this.imgSize[el.vmlBg].height,
				'L': el.offsetLeft,
				'T': el.offsetTop,
				'bLW': el.clientLeft,
				'bTW': el.clientTop
			};
			var fudge = (size.L + size.bLW == 1) ? 1 : 0;
			var makeVisible = function (vml, l, t, w, h, o) {
				vml.coordsize = w + ',' + h;
				vml.coordorigin = o + ',' + o;
				vml.path = 'm0,0l' + w + ',0l' + w + ',' + h + 'l0,' + h + ' xe';
				vml.style.width = w + 'px';
				vml.style.height = h + 'px';
				vml.style.left = l + 'px';
				vml.style.top = t + 'px';
			};
			makeVisible(el.vml.color.shape,
				size.L + (el.isImg ? 0 : size.bLW),
				size.T + (el.isImg ? 0 : size.bTW),
				size.W - 1, size.H - 1, 0);
			makeVisible(el.vml.image.shape,
				size.L + size.bLW,
				size.T + size.bTW,
				size.W, size.H, 1);
			var bg = { 'X': 0, 'Y': 0 };
			if (el.isImg) {
				bg.X = parseInt(thisStyle.paddingLeft, 10) + 1;
				bg.Y = parseInt(thisStyle.paddingTop, 10) + 1;
			}
			else {
				for (var b in bg) {
					if (bg.hasOwnProperty(b)) {
						this.figurePercentage(bg, size, b, thisStyle['backgroundPosition' + b]);
					}
				}
			}
			el.vml.image.fill.position = (bg.X / size.W) + ',' + (bg.Y / size.H);
			var bgR = thisStyle.backgroundRepeat;
			var dC = {
				'T': 1,
				'R': size.W + fudge,
				'B': size.H,
				'L': 1 + fudge
			};
			var altC = {
				'X': {'b1': 'L', 'b2': 'R', 'd': 'W'},
				'Y': {'b1': 'T', 'b2': 'B', 'd': 'H'}
			};
			if (bgR != 'repeat') {
				var c = {
					'T': bg.Y,
					'R': bg.X + size.w,
					'B': bg.Y + size.h,
					'L': bg.X
				};
				if (bgR.search('repeat-') != -1) {
					var v = bgR.split('repeat-')[1].toUpperCase();
					c[altC[v].b1] = 1;
					c[altC[v].b2] = size[altC[v].d];
				}
				if (c.B > size.H) {
					c.B = size.H;
				}
				var cR = c.R + fudge;
				var cL = c.L + fudge;
				el.vml.image.shape.style.clip = 'rect('
					+ c.T + 'px '
					+ cR  + 'px '
					+ c.B + 'px '
					+ cL  + 'px)';
			}
			else {
				el.vml.image.shape.style.clip = 'rect('
					+ dC.T + 'px '
					+ dC.R + 'px '
					+ dC.B + 'px '
					+ dC.L + 'px)';
			}
		},
		vmlSize: function(el) {
			if (el.isImg) {
				var width  = el.width  / 96 * 72;
				var height = el.height / 96 * 72;
			}
			else {
				var img = doc.createElement("img");
				img.src = el.vmlBg;
				var run = img.runtimeStyle;
				var mem = { w: run.width, h: run.height };
				run.width  = 'auto';
				run.height = 'auto';
				w = img.width;
				h = img.height;
				var width  = w / 96 * 72;
				var height = h / 96 * 72;
			}
			el.vml.image.fill.type = 'tile';
			el.vml.image.fill.size = width + 'pt,' + height + 'pt';
		},
		figurePercentage: function (bg, size, axis, position) {
			var fraction = true;
			var horizontal = axis == 'X';
			switch (position) {
				case 'left':
				case 'top':
					bg[axis] = 0;
					break;
				case 'center':
					bg[axis] = 0.5;
					break;
				case 'right':
				case 'bottom':
					bg[axis] = 1;
					break;
				default:
					position.search('%') != -1
						? bg[axis] = parseInt(position, 10) / 100
						: fraction = false;
			}
			bg[axis] = Math.ceil(fraction
				? (size[horizontal ? 'W' : 'H'] * bg[axis]) - (size[horizontal ? 'w' : 'h'] * bg[axis])
				: parseInt(position, 10));
			if (bg[axis] % 2 === 0) {
				bg[axis]++;
			}
			return bg[axis];
		},
		fixPng: function (el) {
			if (el.nodeName == 'BODY' || el.nodeName == 'TD' || el.nodeName == 'TR') {
				return;
			}
			el.isImg = false;
			if (el.nodeName == 'IMG') {
				if(el.src.toLowerCase().search(/\.png$/) != -1) {
					el.isImg = true;
					el.style.visibility = 'hidden';
				}
				else {
					return;
				}
			}
			else if (el.currentStyle.backgroundImage.toLowerCase().search('.png') == -1) {
				return;
			}
			
			var lib = DD_belatedPNG;
			var nodeStr = '';
			var v;
			var e;
			var els = {shape: {}, fill: {}};
			el.vml = {color: {}, image: {}};
			
			for (v in el.vml) {
				if (el.vml.hasOwnProperty(v)) {
					for (e in els) {
						if (els.hasOwnProperty(e)) {
							nodeStr = lib.ns + ':' + e;
							el.vml[v][e] = doc.createElement(nodeStr);
						}
					}
				}
			}
			el.buildInAttachEvent = el.attachEvent;
			el.attachEvent = function(anEventName, anEventHandler) {
				var mouseEvent = anEventName.match(/^onmouse(over|enter|out|leave)/);
				if (mouseEvent) {
					if (!el.style.filter) {
						el.style.filter = 'alpha(opacity=100)';
					}
					var func = function() {
						anEventHandler.apply(el, arguments);
					};
					if (mouseEvent[1] == 'over' || mouseEvent[1] == 'enter') {
						el.vml.image.shape.attachEvent('onmouseenter', func);
					}
					else if (mouseEvent[1] == 'out' || mouseEvent[1] == 'leave') {
						el.vml.image.shape.attachEvent('onmouseleave', func);
					}
				}
				else {
					el.buildInAttachEvent(anEventName, anEventHandler);
				}
			};

			el.vml.image.shape.fillcolor = 'none';
			el.vml.color.fill.on = false;
			el.offsetNode = el.offsetParent.nodeName.match(/HTML|BODY/)
				? el.parentNode : el.offsetParent;
			lib.attachHandlers(el);
			lib.giveLayout(el);
			lib.giveLayout(el.offsetNode);
			el.vmlInitiated = true;
			lib.applyVML(el);

			for (v in el.vml) {
				if (el.vml.hasOwnProperty(v)) {
					el.vml[v].shape.stroked = false;
					el.vml[v].shape.appendChild(el.vml[v].fill);
					el.parentNode.insertBefore(el.vml[v].shape, el);
				}
			}
		}
	};
	try {
		doc.execCommand("BackgroundImageCache", false, true);
	} catch(r) {}
	DD_belatedPNG.createVmlNameSpace();
	DD_belatedPNG.createVmlStyleSheet();
	
	$.extend($.fn, {
		fixPng: function() {
			if ([,] != 0) { // IE6/7/8
				$.each(this, function() {
					DD_belatedPNG.fixPng(this);
				});
			}
			return this;
		}
	});
})(jQuery);
