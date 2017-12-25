/*
	zipng.js 1.0 - ファイルをPNG画像にするヤツ
	2017/12/24 (c)よぴそふと http://yopisoft.net/
	
*/

var MaxSize   = 10; //MB 最大容量
var Zipng     = {
	data   : null,
	buffer : null,
	base64 : null
};

function zipng(file){
	var type  = file.type;
	var size  = file.size;
	var name  = file.name;
	var sizef = function(s){
		var f = parseFloat(s);
		var a = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		for(var i in a){
			if(f < 1024) return (i > 0 ? f.toFixed(2):f)+''+a[i];
			f = parseFloat(f / 1024);
		}
		return 0;
	};
	var sizef = sizef(size);
	
	
	// サイズチェック
	if((size / 1024 / 1024) > MaxSize){
		var div = $('<div>').addClass('fa fa-ban msg').text('Data too large');
		var s     = $('<div>').addClass('sizef').text(sizef +' / '+ MaxSize + 'MB');
		$('#result').hide().empty().append(div, s).slideDown();
		return;
	}
	
	// ファイルタイプチェック
	var reader = new FileReader();
	if(type.match(/^image\/png$/)){
		reader.readAsDataURL(file);
	}else if(type.match(/^application\/(zip|x-zip-compressed)$/)){
		reader.readAsArrayBuffer(file);
	}else{
		reader.readAsArrayBuffer(file);
	}
	
	reader.addEventListener('load', function(e){
	
		var data = e.target.result;
		
		if(type.match(/^image\/png$/)){
			// Image -> Zip
			img2zip(e.target,function(url, file_data){				
				decodeView(file_data, name);
			});
		}else if(type.match(/^application\/(x-zip-compressed)$/)){
			// Zip -> Image
			var base64 = zip2img(e.target, 'image/png');
			encodeVew(base64, name);
			
		}else{
			// その他のファイル
			// File -> Zip -> Image
			var zip = new JSZip();
      		zip.file(name, this.result, {binary:true});
      		zip.generateAsync({type : "uint8array"}).then(function (u8ary) {
    			var base64 = zip2img({result:u8ary});
				encodeVew(base64, name, 1);
			});
		}
	}, false);
	
	// メッセージ１行表示
	function msgRow(msg, class_name){
		class_name = class_name ? class_name : 'fa fa-commenting zipmsg';
		return $('<div>').append($('<span>').addClass(class_name).text(msg));
	}
	
	// エンコードの表示
	function encodeVew(base64, name, zip_flag){
		var url   = base642url(base64);
		var nm    = name + '.png';
		
		var a    = $('<a>').attr({class:'fa fa-download download', href:url, download:nm}).text(nm);
		a = $('<div>').addClass('msg').append(a);
		
		// IE11対策 window.navigator.msSaveBlob でDLさす
		a.click(function(){
			if(window.navigator.msSaveBlob){
				console.log('IE11?');
				var blob  = base642url(base64, {type:'blob'});
				window.navigator.msSaveBlob(blob, nm);
			}
		});
			
		var img   = $('<img>').attr({src:base64, class:'encimg'});
		var size  = $('<div>').addClass('sizef').text(nm +' '+ sizef);
		
		var zip   = msgRow('zip compressed');
		var div   = msgRow('Zipng encode');
		
		var res  = zip_flag ? [img, size, zip, div, a] : [img, size, div, a];
		$('#result').hide().empty().append(res).slideDown();
			
	}
	
	// デコード表示
	function decodeView(file_data, name){
		var nm   = name.replace(/(\.[^\.]+)$/i, ''); // 拡張子消し
			nm += nm.match(/\.zip$/i) ? '' : '.zip'; // .zip付け
			
		var file_data_uint8 = new Uint8Array(file_data);
		var blob = new Blob([file_data_uint8.buffer], { type: "application/zip" });
		var url = window.URL.createObjectURL(blob);
			
		var a = $('<a>').attr({class:'fa fa-download download', href:url, download:nm}).text(nm);
		a = $('<div>').addClass('msg').append(a);
		
		// IE11対策 window.navigator.msSaveBlob でDLさす
		a.click(function(){
			if(window.navigator.msSaveBlob){
				console.log('IE11?');
				window.navigator.msSaveBlob(blob, nm);
			}
		});
		
		var div = msgRow('Zipng decoded');
		
		$('#result').hide().empty().append(div, a).slideDown();
	}

}



// zipを画像に変換
// file -> image
function zip2img(file_reader, format) {
	if(! format) format = 'image/png';
	var data = new Uint8ClampedArray(file_reader.result);
	data = concatTypedArrays(data, magicnumber);

	// canvasの大きさ(正方形)
	var img_size = Math.ceil(Math.sqrt((data.length/3.0) + 1));

	// canvasのcontextの取得
	//var canvas = document.getElementById("canvas");
	var canvas = document.createElement('canvas');
	canvas.width = img_size;
	canvas.height = img_size;
	var ctx = canvas.getContext("2d");
	var imgData = ctx.createImageData(img_size, img_size);

	// データを画素に変更
	var tmp_idx = 0;
	for (var i=0;i < data.length; i+=3) {
		imgData.data[tmp_idx++] = data[i];   //red
		imgData.data[tmp_idx++] = data[i+1]; //green
		imgData.data[tmp_idx++] = data[i+2]; //blue
		// imgData.data[i+3] = data[i+3]; //alpha // 透過を指定するとputImageDataで画素値が変わる現象がある
		imgData.data[tmp_idx++] = 255;
	}

	// 1ピクセルを透過させる(Twitterの圧縮対策)
	imgData.data[tmp_idx++] = 255;
	imgData.data[tmp_idx++] = 0
	imgData.data[tmp_idx++] = 0
	imgData.data[tmp_idx++] = 0;
	
	//alert("変換が終了しました.表示された画像を右クリックなどでDLしてください.")
	ctx.putImageData(imgData,0,0);
	
	return canvas.toDataURL(format);
}

// image -> file
function img2zip(img_reader, func) {
	var img = new Image();
	img.src = img_reader.result;
	img.onload = function(){
		// contextの取得
		//var canvas = document.getElementById("canvas");
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext("2d");
		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);

		// canvasの画素の取得
		var data = ctx.getImageData(0, 0, canvas.width, canvas.height);

	    // 画素値からデータを取り出す
		var file_data = [];
		for( var idx=0; idx<data.data.length; idx++ ) {
			if ((idx+1) % 4 !== 0) {
				file_data.push(data.data[idx]);
			}
		}

		// magicnumberを参照してファイルの最後を削る
		var tmp_file_str = file_data.join(".");
		var tmp_last_str = magicnumber_array.join(".");
		var tmp_last_idx = tmp_file_str.lastIndexOf(tmp_last_str)
		var tmp_pure_file_str = tmp_file_str.slice(0, tmp_last_idx);
		var last_idx = counter(tmp_pure_file_str, ".");
		file_data = file_data.slice(0, last_idx);

		// blobに変換してurlを出力
		var file_data_uint8 = new Uint8Array(file_data);
		var blob = new Blob([file_data_uint8.buffer], { type: "application/zip" });
		var url = window.URL.createObjectURL(blob);
		
		//alert("変換が終了しました.表示されるリンクからDLしてください.")
		//showDLlink(url);
		
		func(url, file_data);
	}
}

// base64 -> url
function base642url(base64, opt){
	opt = opt ? opt : {type:'url'};
	var type = base64.match(/^data:(.*);base64,/, function(){return RegExp.$1;})[1];
	var bin  = atob(base64.replace(/^.*,/, ''));
	var ary  = new Uint8Array(bin.length);
	for (var i = 0; i < bin.length; i++) {
		ary[i] = bin.charCodeAt(i);
	}
	var blob = new Blob([ary.buffer], {type:type});
	var url  = window.URL.createObjectURL(blob);
	if(opt.type == 'blob') return blob;
	return url;
}




