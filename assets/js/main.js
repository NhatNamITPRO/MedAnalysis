doOrigin = true
mode = 'flair'
valueNiiRange = NaN
originData = NaN
originData = NaN
// Giờ canvasOriginCopy và canvasMainCopy là các bản sao độc lập của canvasOrigin và canvasMain
function choseOption(event) {
    const options = document.querySelectorAll('.option'); 
    
    options.forEach(option => {
        option.classList.remove('active');
    });

    const clickedOption = event.target.closest('.option');
    if (clickedOption) {
        clickedOption.classList.add('active');
    }
}
function view(event) {
    const home = document.getElementById('home'); 
    const predict = document.getElementById('predict'); 
    const fileInput = document.getElementById('file-upload');
    const selectedOption = document.querySelector('.option.active');

    if (fileInput.files.length > 0 && selectedOption) {
        home.classList.toggle('hidden');
        predict.classList.toggle('hidden');
    } else {
        alert("Vui lòng chọn file và một trong các tùy chọn (MRI, CT, Da liễu) trước khi xem!");
    }
}


function predict(event) {
    const home = document.getElementById('home'); 
    const predict = document.getElementById('predict'); 
    const fileInput = document.getElementById('file-upload');
    const loadingOverlay = document.getElementById('loading-overlay');
    const option__active = document.querySelector('.option.active');

    if (fileInput.files.length > 0 && option__active) {
        home.classList.add('hidden');
        predict.classList.remove('hidden');

        // Hiển thị overlay loading
        loadingOverlay.classList.remove('hidden');
        
        // Tạo FormData để gửi tệp và thông tin option
        const formData = new FormData();
        const file = fileInput.files[0];
        formData.append('file', file);
        if(option__active.id.includes('mri')){
            formData.append('number', '1'); // Lấy giá trị 'number' từ thuộc tính data của phần tử tùy chọn
        }else{
            formData.append('number', '2'); // Lấy giá trị 'number' từ thuộc tính data của phần tử tùy chọn
        }

        // Gửi request đến API Flask
        fetch('https://web-production-3f4c.up.railway.app/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi từ server');
            }
            // Kiểm tra loại phản hồi để xử lý
            const contentType = response.headers.get("Content-Type");

            if (contentType && contentType.includes("application/gzip")) {
                // Xử lý khi server trả về file .gz
                return response.blob();
            } else if (contentType && contentType.includes("image/png")) {
                // Xử lý khi server trả về ảnh phân đoạn .png
                return response.blob();
            } else {
                return response.json();
            }
        })
        .then(blob => {
            // Ẩn overlay loading
            loadingOverlay.classList.add('hidden');
            
            if (blob.type === 'application/gzip') {
                // Nếu là file nén .gz, giải nén bằng pako trước khi gọi readNIFTI
                blob.arrayBuffer().then(data => {
                    const compressedData = new Uint8Array(data);
                    const decompressedData = pako.inflate(compressedData);
                    console.log(decompressedData.buffer)
                    readNIFTI(decompressedData.buffer, true); // Gọi hàm xử lý NIfTI với dữ liệu đã giải nén
                });
                //
                predictData = blob
            } else if (blob.type === 'image/png') {
                const img = new Image();
                const predictedCanvas = document.querySelector('.predicted-image'); // Lấy canvas dự đoán
                const tmpPredictedCanvas = document.querySelector('.tmp-predict-image'); // Lấy canvas dự đoán
                const ctx = predictedCanvas.getContext('2d'); // Lấy context của canvas
                const tmpctx = tmpPredictedCanvas.getContext('2d'); // Lấy context của canvas

                img.onload = function() {
                    // Vẽ ảnh lên canvas sau khi ảnh được tải
                    predictedCanvas.width = img.width; // Cập nhật kích thước canvas theo kích thước ảnh
                    predictedCanvas.height = img.height;
                    ctx.drawImage(img, 0, 0); // Vẽ ảnh vào canvas tại vị trí (0, 0)

                    tmpPredictedCanvas.width = img.width; // Cập nhật kích thước canvas theo kích thước ảnh
                    tmpPredictedCanvas.height = img.height;
                    tmpctx.drawImage(img, 0, 0); // Vẽ ảnh vào canvas tại vị trí (0, 0)
                };
                predictData = blob
                // Chuyển đổi blob thành URL cho ảnh
                img.src = URL.createObjectURL(blob);
            } else {
                // Nếu có lỗi từ server, hiển thị thông báo lỗi
                alert('Lỗi từ server: ' + blob.message || 'Không rõ');
            }
        })
        .catch(error => {
            // Ẩn overlay loading và hiển thị lỗi
            loadingOverlay.classList.add('hidden');
            alert('Có lỗi xảy ra: ' + error.message);
        });
    } else {
        alert("Vui lòng chọn file và một trong các tùy chọn (MRI, CT, Da liễu) trước khi dự đoán!");
    }
}


function home(event) {
    const home = document.getElementById('home'); 
    const predict = document.getElementById('predict'); 
    home.classList.toggle('hidden');
    predict.classList.toggle('hidden');
    window.location.reload();
}

function readNIFTI(data, isPredict = false) {
    if (isPredict){
        var canvasNav = document.querySelector('.predicted-image');
        var canvasTmp = document.querySelector('.tmp-predict-image');
    }else{
        var canvasNav = document.querySelector('.origin-image');
        var canvasTmp = document.querySelector('.tmp-origin-image');
    }
    var canvasMain = document.querySelector('.main-image');
    var slider = document.getElementById('niiRange');
    var niftiHeader, niftiImage;

    if (nifti.isNIFTI(data)) {
        niftiHeader = nifti.readHeader(data);
        niftiImage = nifti.readImage(niftiHeader, data);
    }

    var slices = niftiHeader.dims[3];
    slider.max = slices - 1;
    if(!valueNiiRange){
        slider.value = Math.round(slices / 2);
    }else{
        slider.value = valueNiiRange;
    }

    drawCanvas(canvasNav, slider.value, niftiHeader, niftiImage);
    drawCanvas(canvasMain, slider.value, niftiHeader, niftiImage);
    drawCanvas(canvasTmp, slider.value, niftiHeader, niftiImage);
    rotate()
    slider.addEventListener('input', function() {
        var currentSlice = parseInt(slider.value);
        valueNiiRange = currentSlice;
        if (currentSlice >= 0 && currentSlice < slices) {
            drawCanvas(canvasNav, currentSlice, niftiHeader, niftiImage);
            drawCanvas(canvasMain, currentSlice, niftiHeader, niftiImage,isShow = true);
            drawCanvas(canvasTmp, currentSlice, niftiHeader, niftiImage);
            rotate();
        }
    });
    
}

function parseNiftiImage(niftiHeader, niftiImage) {
    let TypedArray;
    switch (niftiHeader.datatypeCode) {
        case 2:  // Unsigned Byte (UInt8)
            TypedArray = Uint8Array;
            break;
        case 4:  // Signed Short (Int16)
            TypedArray = Int16Array;
            break;
        case 8:  // Signed Integer (Int32)
            TypedArray = Int32Array;
            break;
        case 16: // Float (Float32)
            TypedArray = Float32Array;
            break;
        case 64: // Double (Float64)
            TypedArray = Float64Array;
            break;
        case 256: // Signed Byte (Int8)
            TypedArray = Int8Array;
            break;
        case 512: // Unsigned Short (UInt16)
            TypedArray = Uint16Array;
            break;
        case 768: // Unsigned Integer (UInt32)
            TypedArray = Uint32Array;
            break;
        default:
            throw new Error(`Unsupported data type code: ${niftiHeader.datatypeCode}`);
    }

    // Chuyển đổi niftiImage sang đúng kiểu dữ liệu
    return new TypedArray(niftiImage);
}
cc = true
function drawCanvas(canvas, sliceIndex, niftiHeader, niftiImage) {
    console.log("niftiImage:", niftiImage);
    console.log("datatypeCode:", niftiHeader.datatypeCode);
    console.log("dims:", niftiHeader.dims);

    const width = niftiHeader.dims[1];
    const height = niftiHeader.dims[2];
    const depth = niftiHeader.dims[3];
    const channels = niftiHeader.dims[4] || 1;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const canvasImageData = ctx.createImageData(width, height);

    // Chuyển đổi niftiImage sang dạng TypedArray tương ứng
    const niftiTypedArray = parseNiftiImage(niftiHeader, niftiImage);

    // Tính giá trị min và max trong dữ liệu
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < niftiTypedArray.length; i++) {
        const value = niftiTypedArray[i];
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    // Tính offset của slice

    // Vẽ ảnh lên canvas
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            

            if (channels === 1) {
                const sliceOffset = sliceIndex * width * height * channels;
                const voxelIndex = sliceOffset + (y * width + x) * channels;
                const pixelIndex = y * width * 4 + x * 4;
                let grayscaleValue = niftiTypedArray[voxelIndex];
                grayscaleValue = Math.round(((grayscaleValue - min) / (max - min)) * 255);
                grayscaleValue = Math.min(Math.max(grayscaleValue, 0), 255);
                canvasImageData.data[pixelIndex] = grayscaleValue;      // R
                canvasImageData.data[pixelIndex + 1] = grayscaleValue;  // G
                canvasImageData.data[pixelIndex + 2] = grayscaleValue;  // B
                canvasImageData.data[pixelIndex + 3] = 255;            // Alpha
            } else if (channels === 3) {
                const pixelIndex = y * width * 4 + x * 4; // Mỗi pixel có 4 giá trị (R, G, B, Alpha)
                //depth * width * height * channels;
                const r = niftiTypedArray[ 0 * depth * height * width + sliceIndex * height * width +  y * width + x]; // Red channel
                const g = niftiTypedArray[ 1 * depth * height * width + sliceIndex * height * width +  y * width + x]; // Green channel
                const b = niftiTypedArray[ 2 * depth * height * width + sliceIndex * height * width +  y * width + x];   // Blue channel
                // Gán các giá trị RGB vào ImageData
                canvasImageData.data[pixelIndex] = r;        // Red channel
                canvasImageData.data[pixelIndex + 1] = g;    // Green channel
                canvasImageData.data[pixelIndex + 2] = b;    // Blue channel
                canvasImageData.data[pixelIndex + 3] = 255;  // Alpha channel (set full opacity)
              
                
            }
        }
    }

    ctx.putImageData(canvasImageData, 0, 0);
}


function displayImageOnCanvas(imageSrc) {
    var canvasNav = document.querySelector('.origin-image');
    var canvasMain = document.querySelector('.main-image');
    var canvasTmp = document.querySelector('.tmp-origin-image');
    var ctxNav = canvasNav.getContext("2d",{ willReadFrequently: true });
    var ctxMain = canvasMain.getContext("2d",{ willReadFrequently: true });
    var ctxTmp = canvasTmp.getContext("2d",{ willReadFrequently: true });

    var img = new Image();
    img.onload = function () {
        // Thiết lập kích thước của canvas theo kích thước của ảnh
        canvasNav.width = img.width;
        canvasNav.height = img.height;
        canvasMain.width = img.width;
        canvasMain.height = img.height;
        canvasTmp.width = img.width;
        canvasTmp.height = img.height;
        // Vẽ ảnh lên canvas
        ctxNav.drawImage(img, 0, 0, img.width, img.height);
        ctxMain.drawImage(img, 0, 0, img.width, img.height);
        ctxTmp.drawImage(img, 0, 0, img.width, img.height);
    };
    img.src = imageSrc;
}

async function readFileInZip(char = 'flair') {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    const zip = new JSZip();
    try {
        const _ = await zip.loadAsync(file);

        for (const zipEntry of Object.values(zip.files)) {
            if (zipEntry.name.endsWith('.nii') && zipEntry.name.includes(char)) {
                let niiFile = zipEntry
                if (niiFile) {
                    const niiContent = await niiFile.async("arraybuffer");
                    readNIFTI(niiContent);
                }
                return; 
            }
        }

        alert('No matching file found in the zip.');
        return;
    } catch (error) {
        alert('Error while reading the zip file');
        return;
    }
}

async function readFile(file) {
    const blob = file.slice(0, file.size);
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onloadend = async function (evt) {
        if (evt.target.readyState === FileReader.DONE) {
            if (fileExtension === 'zip') {
                readFileInZip()
            } else if (['jpg', 'png', 'jpeg'].includes(fileExtension)) {
                displayImageOnCanvas(evt.target.result);
            }
        }
    };

    if (['jpg', 'png', 'jpeg'].includes(fileExtension)) {
        reader.readAsDataURL(blob);
    } else {
        reader.readAsArrayBuffer(blob);
    }
}

// Thêm sự kiện để hiển thị ảnh trên main-image khi nhấp vào origin-image hoặc predicted-image
document.addEventListener("DOMContentLoaded", function () {
    var canvasNav = document.querySelector(".origin-image");
    var canvasPredicted = document.querySelector(".predicted-image");
  
    // Sự kiện click vào origin-image
    canvasNav.addEventListener("click", function () {
        doOrigin = true
        var originImageSrc = canvasNav.toDataURL();
        updateMainImage(originImageSrc);
    });
  
    // Sự kiện click vào predicted-image
    canvasPredicted.addEventListener("click", function () {
        doOrigin = false
        var predictedImageSrc = canvasPredicted.toDataURL();
        updateMainImage(predictedImageSrc);
    });
  });
  
  function updateMainImage(imageSrc) {
    
    var canvasMain = document.querySelector(".main-image");
    var ctxMain = canvasMain.getContext("2d", { willReadFrequently: true });
  
    var img = new Image();
    img.onload = function () {
      // Thiết lập kích thước của main-image canvas theo kích thước ảnh
        canvasMain.width = img.width;
        canvasMain.height = img.height;
    
        // Xóa nội dung cũ và vẽ ảnh mới lên main-image canvas
        ctxMain.clearRect(0, 0, canvasMain.width, canvasMain.height);
        ctxMain.drawImage(img, 0, 0, img.width, img.height);
        const isNegative = JSON.parse(localStorage.getItem('negative'));
        if(isNegative){
            negative()
        }
    };
    img.src = imageSrc;
    
  }
function negative() {
    // Kiểm tra và cập nhật biến 'negative' trong localStorage
    // Lấy canvas và context
    const canvas = document.querySelector('.main-image');
    const ctxMain = canvas.getContext("2d", { willReadFrequently: true });

    // Lấy dữ liệu ảnh từ canvas
    const imageData = ctxMain.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Nếu isNegative là true, áp dụng hiệu ứng âm ảnh
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];       // Đảo màu đỏ
        data[i + 1] = 255 - data[i + 1]; // Đảo màu xanh lá
        data[i + 2] = 255 - data[i + 2]; // Đảo màu xanh dương
    }
    ctxMain.putImageData(imageData, 0, 0);
}
document.getElementById('file-upload').addEventListener('click', function(event) { 
    var option__active = document.querySelector('.option.active');
    if (!option__active) {
        alert("Option not chosen");
        window.location.reload();
        return;
    }
});

document.getElementById('file-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const fileNameElement = document.getElementById('file-name');
    var slider = document.getElementById('niiRange');
    var option__active = document.querySelector('.option.active');
    let imgTitle = document.getElementById("image-title")
    let dropdown = document.querySelector('.dropdown')
    if (file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension === 'zip') {
            if(!option__active.id.includes('mri')){
                alert(`File ${fileExtension} not match to option`);
                window.location.reload();
                return
            }
            if (slider.classList.contains('hidden')){
                slider.classList.remove('hidden')
            }
            if(imgTitle.classList.contains('hidden')){
                imgTitle.classList.remove('hidden')
            }
            if(dropdown.classList.contains('hidden')){
                dropdown.classList.remove('hidden')
            }
            fileNameElement.textContent = `${file.name}`;
            //Chọn chế độ
            readFile(file);
            originData = file

        } else if (['jpg', 'png', 'jpeg'].includes(fileExtension)) {
            if(!option__active.id.includes('derma')){
                alert(`File ${fileExtension} not match to option`);
                window.location.reload();
                return
            }
            if (!slider.classList.contains('hidden')){
                slider.classList.add('hidden')
            }
            if(!imgTitle.classList.contains('hidden')){
                imgTitle.classList.add('hidden')
            }
            if(!dropdown.classList.contains('hidden')){
                dropdown.classList.add('hidden')
            }
            fileNameElement.textContent = `${file.name}`;
            readFile(file);
            originData = file

        }
        else{
            alert("File format is incorrect")
        }
        
    } else {
        fileNameElement.textContent = '';
    }
});

function rotate() {
    let currentAngle = NaN
    if(doOrigin){
        currentAngle = JSON.parse(localStorage.getItem('currentAngle-Origin'));
    }else{
        currentAngle = JSON.parse(localStorage.getItem('currentAngle-Predict'));

    }
    const canvasMain = document.querySelector('.main-image');
    let canvasOriginPredict = NaN
    let canvasTmp = NaN

    if (doOrigin){
        canvasOriginPredict = document.querySelector('.origin-image');
        canvasTmp = document.querySelector('.tmp-origin-image');

    }else{
        canvasOriginPredict = document.querySelector('.predicted-image');
        canvasTmp = document.querySelector('.tmp-predict-image');

    }
    
    const ctxMain = canvasMain.getContext("2d", { willReadFrequently: true });
    const ctxOriginPredict = canvasOriginPredict.getContext("2d", { willReadFrequently: true });

   
    // Tạo một canvas tạm để lưu ảnh sau khi xoay
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext("2d");

    // Xoay ảnh 90 độ bằng cách chuyển đổi chiều rộng và chiều cao của canvas
    tempCanvas.width = canvasMain.width;
    tempCanvas.height = canvasMain.height;

    // Xoay canvas và vẽ lại hình ảnh
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);  // Di chuyển điểm gốc đến trung tâm
    tempCtx.rotate(currentAngle);  // Xoay 90 độ
    tempCtx.drawImage(canvasTmp, -canvasTmp.width / 2, -canvasTmp.height / 2); // Vẽ ảnh vào canvas đã xoay

    
    ctxMain.clearRect(0, 0, canvasMain.width, canvasMain.height); // Xóa nội dung cũ
    ctxMain.drawImage(tempCanvas, 0, 0); // Vẽ ảnh xoay lên canvas chính
    ctxOriginPredict.clearRect(0, 0, canvasMain.width, canvasMain.height); // Xóa nội dung cũ
    ctxOriginPredict.drawImage(tempCanvas, 0, 0); // Vẽ ảnh xoay lên canvas chính
    const isNegative = JSON.parse(localStorage.getItem('negative'));
    if(isNegative){
        negative()
    }
}

document.getElementById('negative').addEventListener('click', function(event){
    this.classList.toggle('active');
    let isNegative = JSON.parse(localStorage.getItem('negative'));
    if (isNegative === null) {
        isNegative = true;
    } else {
        isNegative = !isNegative;
    }
    localStorage.setItem('negative', JSON.stringify(isNegative));
    negative()
})
document.getElementById('rotate').addEventListener('click', function(event){
    if(doOrigin){
        let currentAngleOrigin = JSON.parse(localStorage.getItem('currentAngle-Origin'));
        if (currentAngleOrigin === null) {
            currentAngleOrigin = 0;
        } 
        currentAngleOrigin += Math.PI/2
        localStorage.setItem('currentAngle-Origin', JSON.stringify(currentAngleOrigin));
    }else{
        let currentAnglePredict = JSON.parse(localStorage.getItem('currentAngle-Predict'));
        if (currentAnglePredict === null) {
            currentAnglePredict = 0;
        } 
        currentAnglePredict += Math.PI/2
        localStorage.setItem('currentAngle-Predict', JSON.stringify(currentAnglePredict));

    }
    rotate()
})
window.addEventListener('beforeunload', function() {
    localStorage.clear();
});




document.addEventListener("DOMContentLoaded", function () {
    const canvasMain = document.querySelector('.main-image');
    const ctxMain = canvasMain.getContext("2d", { willReadFrequently: true });
    var canvasOrigin = NaN
    if(doOrigin){
        canvasOrigin = document.querySelector('.origin-image');
    }else{
        canvasOrigin = document.querySelector('.predicted-image');
    }
    
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let imgPosX = 0;
    let imgPosY = 0;

    let scale = JSON.parse(localStorage.getItem('scale')) || 1;

    // Vẽ lại hình ảnh với scale và vị trí
    function drawImage() {
        if(doOrigin){
            canvasOrigin = document.querySelector('.origin-image');
        }else{
            canvasOrigin = document.querySelector('.predicted-image');
        }
        ctxMain.clearRect(0, 0, canvasMain.width, canvasMain.height);
        ctxMain.save();
        ctxMain.scale(scale, scale);
        ctxMain.drawImage(
            canvasOrigin,
            imgPosX / scale,
            imgPosY / scale,
            canvasOrigin.width,
            canvasOrigin.height
        );
        ctxMain.restore();
        const isNegative = JSON.parse(localStorage.getItem('negative'));
        if(isNegative){
            negative()
        }
        
    }

    // Giới hạn vị trí kéo để ảnh luôn lấp đầy canvas
    function clampPosition() {
        const scaledWidth = canvasOrigin.width * scale;
        const scaledHeight = canvasOrigin.height * scale;

        const maxX = 0;
        const maxY = 0;
        const minX = canvasMain.width - scaledWidth;
        const minY = canvasMain.height - scaledHeight;

        // Giới hạn imgPosX và imgPosY
        imgPosX = Math.min(maxX, Math.max(minX, imgPosX));
        imgPosY = Math.min(maxY, Math.max(minY, imgPosY));
    }

    // Khởi tạo canvas
    canvasMain.width = canvasMain.clientWidth;
    canvasMain.height = canvasMain.clientHeight;
    drawImage();

    // Bắt đầu kéo
    canvasMain.addEventListener('mousedown', function (e) {
        
        isDragging = true;
        dragStartX = e.offsetX - imgPosX;
        dragStartY = e.offsetY - imgPosY;
    });

    // Kéo ảnh
    canvasMain.addEventListener('mousemove', function (e) {
      
        if (isDragging) {
            imgPosX = e.offsetX - dragStartX;
            imgPosY = e.offsetY - dragStartY;

            // Giới hạn vị trí kéo để tránh bị trống canvas
            clampPosition();
            drawImage();
        }
    });

    // Dừng kéo
    canvasMain.addEventListener('mouseup', function () {
        isDragging = false;
    });

    // Dừng kéo khi chuột ra khỏi canvas
    canvasMain.addEventListener('mouseleave', function () {
        isDragging = false;
    });

    // Cập nhật tỉ lệ zoom khi nhấn nút zoom-in/zoom-out
    document.getElementById('zoom-in').addEventListener('click', function () {
        scale *= 1.1;
        localStorage.setItem('scale', JSON.stringify(scale));
        clampPosition(); // Cập nhật vị trí sau khi zoom
        drawImage();
      
    });

    document.getElementById('zoom-out').addEventListener('click', function () {
        scale /= 1.1;
        if (scale < 1) scale = 1;
        localStorage.setItem('scale', JSON.stringify(scale));
        clampPosition(); // Cập nhật vị trí sau khi zoom
        drawImage();
    });
   
});

document.getElementById('mode-selector').addEventListener('click', function () {
    const modeOptions = document.getElementById('mode-options');
    modeOptions.classList.toggle('hidden'); 
});

document.getElementById('mode-options').addEventListener('click', function (event) {
    if (event.target.tagName === 'LI') {
        const selectedMode = event.target.getAttribute('data-mode');
        mode = selectedMode.toLowerCase()
        document.getElementById('image-title').textContent = `${selectedMode.toUpperCase()}`;
        readFileInZip(char = mode)
        this.classList.add('hidden'); 
    }
});

// Đóng menu khi click bên ngoài
document.addEventListener('click', function (event) {
    const modeOptions = document.getElementById('mode-options');
    const modeSelector = document.getElementById('mode-selector');
    if (!modeSelector.contains(event.target) && !modeOptions.contains(event.target)) {
        modeOptions.classList.add('hidden');
    }
});

document.getElementById('download').addEventListener('click', async function() {
    if (!originData || !predictData) {
        alert('Chưa có dữ liệu để tải xuống!');
        return;
    }

    const zipFinal = new JSZip(); // Zip chứa tất cả kết quả cuối cùng.

    // Hàm xử lý file nén và chuyển đổi thành file .zip
    const handleCompressedFile = async (blob, fallbackName) => {
        const mimeType = blob.type;
        const tempZip = new JSZip(); // Tạo zip tạm để chứa file gốc đã xử lý.

        // Thêm các MIME type cho các file nén khác như .gz, .tar...
        if (['application/gzip', 'application/zip', 'application/x-tar', 'application/x-zip-compressed'].includes(mimeType)) {
            const arrayBuffer = await blob.arrayBuffer();
            
            if (mimeType === 'application/gzip') {
                const decompressed = pako.inflate(new Uint8Array(arrayBuffer));
                tempZip.file(`${fallbackName}.nii`, decompressed);
            } 
            else if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed' || mimeType === 'application/x-tar') {
                const zip = await JSZip.loadAsync(blob);
                await Promise.all(Object.keys(zip.files).map(async fileName => {
                    const fileData = await zip.files[fileName].async('blob');
                    tempZip.file(fileName, fileData);
                }));
            }

            // Nén tất cả vào file .zip dù gốc là .gz hay .tar
            const zipBlob = await tempZip.generateAsync({ type: 'blob' });
            zipFinal.file(`${fallbackName}.zip`, zipBlob);

        } else {
            // Nếu không phải file nén thì thêm trực tiếp vào zipFinal
            zipFinal.file(`${fallbackName}.${mimeType.split('/')[1] || 'dat'}`, blob);
        }
    };

    // Xử lý cả hai file `originData` và `predictData`
    await Promise.all([
        handleCompressedFile(originData, 'originData'),
        handleCompressedFile(predictData, 'predictData')
    ]);

    // Tạo file zip cuối cùng chứa tất cả kết quả
    zipFinal.generateAsync({ type: 'blob' }).then(content => {
        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = 'final_result.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
    })
    .catch(error => {
        alert('Có lỗi xảy ra khi tạo file zip: ' + error.message);
    });
});


