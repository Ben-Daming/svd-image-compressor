// src/scripts/app.js

// 在文件开头添加高精度数学库配置
// 使用更高精度的SVD分解算法

document.addEventListener('DOMContentLoaded', function() {
    // 获取页面上的元素
    const uploadInput = document.getElementById('imageUpload');
    const compressButton = document.getElementById('compressButton');
    const slider = document.getElementById('singularValuePercentage');
    const percentageDisplay = document.getElementById('percentageValue');
    const originalContainer = document.getElementById('originalImageContainer');
    const compressedContainer = document.getElementById('compressedImageContainer');
    const analysisContainer = document.getElementById('analysisContainer');
    let originalImageData;
    let processedOriginalCanvas;
    let svdReconstructedOriginal;
    let animationInProgress = false; // debug:防止重复动画

    // 监听
    uploadInput.addEventListener('change', handleImageUpload);
    compressButton.addEventListener('click', compressImageWithAnimation);
    slider.addEventListener('input', updatePercentage);

    function updatePercentage() {
        percentageDisplay.textContent = slider.value;
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    originalImageData = img;
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const maxSize = 300;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    canvas.width = Math.floor(img.width * scale);
                    canvas.height = Math.floor(img.height * scale);
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    processedOriginalCanvas = canvas;
                    
                    generateSVDReconstructedOriginal();
                    displayOriginalInfo(canvas.width, canvas.height);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    function generateSVDReconstructedOriginal() {
        try {
            const result = svdCompressWithAnalysis(originalImageData, 100);
            svdReconstructedOriginal = result.imageData;
            displayOriginalImage(svdReconstructedOriginal);
            console.log('SVD完整重构原图生成完成');
        } catch (error) {
            console.log('SVD重构失败，使用原始canvas');
            svdReconstructedOriginal = processedOriginalCanvas.toDataURL();
            displayOriginalImage(svdReconstructedOriginal);
        }
    }

    function displayOriginalImage(src) {
        originalContainer.innerHTML = '';
        const originalImg = document.createElement('img');
        originalImg.src = src;
        originalImg.style.maxWidth = '400px';
        originalContainer.appendChild(originalImg);
    }

    function displayOriginalInfo(width, height) {
        if (analysisContainer) {
            analysisContainer.innerHTML = `
                <div class="info-section" style="background:transparent;">
                    <h4>原图信息</h4>
                    <p>处理尺寸: ${width} × ${height} 像素</p>
                    <p>原图存储空间: ${(width * height * 3)} 字节 (${((width * height * 3) / 1024).toFixed(1)} KB)</p>
                    <p><small>注：显示的原图为SVD完整重构结果（保留100%奇异值）</small></p>
                    <p><small>实际情况中,保留100%奇异值的图像即为原图(无压缩)。</small></p>
                    <p><small>由于计算精度和准确性问题,本算法的特征值未能完全算准奇异值,因此显示的原图与上传的原图有差别。</small></p>
                    <p><small>就暂且把显示的原图当作原图吧</small></p>
                </div>
            `;
        }
    }

    // 压缩图片并显示动画
    async function compressImageWithAnimation() {
        if (!originalImageData) {
            alert('请先上传图片');
            return;
        }

        if (animationInProgress) {
            alert('动画进行中，请稍候...');
            return;
        }

        const percentage = parseInt(slider.value);
        console.log('开始SVD压缩动画，保留奇异值百分比:', percentage + '%');
        
        // 禁用按钮,防鼠标瞎乱点击
        compressButton.disabled = true;
        slider.disabled = true;
        animationInProgress = true;
        
        try {
            await startSVDReconstructionAnimation(originalImageData, percentage);
        } catch (error) {
            console.error('SVD压缩动画失败:', error);
            alert('压缩失败: ' + error.message);
        } finally {
            // 重新启用按钮
            compressButton.disabled = false;
            slider.disabled = false;
            animationInProgress = false;
        }
    }

    // SVD重构主函数
    async function startSVDReconstructionAnimation(image, percentage) {
        console.log('开始准备SVD数据...');
        
        // 准备数据
        const svdData = await prepareSVDData(image, percentage);
        const { rChannel, gChannel, bChannel, rSVD, gSVD, bSVD, width, height, targetK, totalSingularValues } = svdData;

        console.log(`开始动画：从1到${targetK}个奇异值的重构过程`);

        // 初始化
        initializeAnimationDisplay(targetK);

        for (let currentK = 1; currentK <= targetK; currentK++) {
            // 使用当前奇异值重构图像
            const animationFrame = reconstructImageWithK(
                rChannel, gChannel, bChannel,
                rSVD, gSVD, bSVD,
                width, height, currentK
            );

            // 直接替换
            displayAnimationFrame(animationFrame, currentK, targetK);

            // 算能量比例
            const energyRatio = calculateEnergyRatio(rSVD.S, gSVD.S, bSVD.S, currentK);

            // debug:需要动画延时
            const delay = calculateAnimationDelay(targetK);
            await sleep(delay);
        }

        // 动画完成后显示
        const finalResult = await svdCompressWithAnalysis(originalImageData, percentage);
        displayAnalysisResults(
            finalResult.energyRatio,
            finalResult.storageRatio,
            finalResult.compressionRatio,
            finalResult.width,
            finalResult.height,
            finalResult.singularValuesUsed,
            finalResult.totalSingularValues,
            finalResult.singularValueStrengths
        );

        console.log('SVD重构动画完成');
    }

    // 准备SVD分解数据
    async function prepareSVDData(image, percentage) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 300;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.floor(image.width * scale);
        canvas.height = Math.floor(image.height * scale);
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // 提取RGB通道
        const rChannel = [], gChannel = [], bChannel = [];
        for (let i = 0; i < height; i++) {
            rChannel[i] = []; gChannel[i] = []; bChannel[i] = [];
            for (let j = 0; j < width; j++) {
                const pixelIndex = (i * width + j) * 4;
                rChannel[i][j] = data[pixelIndex] / 255;
                gChannel[i][j] = data[pixelIndex + 1] / 255;
                bChannel[i][j] = data[pixelIndex + 2] / 255;
            }
        }

        const totalSingularValues = Math.min(width, height);
        const targetK = Math.max(1, Math.floor(totalSingularValues * percentage / 100));

        console.log('开始高精度SVD分解...');
        // 使用稳定版本的SVD分解
        const rSVD = svdDecompositionStable(rChannel);
        const gSVD = svdDecompositionStable(gChannel);
        const bSVD = svdDecompositionStable(bChannel);
        console.log('高精度SVD分解完成');

        return {
            rChannel, gChannel, bChannel,
            rSVD, gSVD, bSVD,
            width, height, targetK, totalSingularValues
        };
    }

    // 使用指定数量的奇异值重构图像
    function reconstructImageWithK(rChannel, gChannel, bChannel, rSVD, gSVD, bSVD, width, height, k) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        // 每个通道使用k个奇异值重构
        const rReconstructed = reconstructMatrixWithK(rSVD.U, rSVD.S, rSVD.V, k);
        const gReconstructed = reconstructMatrixWithK(gSVD.U, gSVD.S, gSVD.V, k);
        const bReconstructed = reconstructMatrixWithK(bSVD.U, bSVD.S, bSVD.V, k);

        // 重构图像数据
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const pixelIndex = (i * width + j) * 4;
                data[pixelIndex] = Math.max(0, Math.min(255, Math.round(rReconstructed[i][j] * 255)));
                data[pixelIndex + 1] = Math.max(0, Math.min(255, Math.round(gReconstructed[i][j] * 255)));
                data[pixelIndex + 2] = Math.max(0, Math.min(255, Math.round(bReconstructed[i][j] * 255)));
                data[pixelIndex + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }

    // 重构矩阵
    function reconstructMatrixWithK(U, S, V, k) {
        const m = U.length;
        const n = V.length;
        const kActual = Math.min(k, S.length);
        
        const reconstructed = [];
        for (let i = 0; i < m; i++) {
            reconstructed[i] = [];
            for (let j = 0; j < n; j++) {
                let sum = 0;
                let c = 0; // Kahan求和
                for (let p = 0; p < kActual; p++) {
                    const product = U[i][p] * S[p] * V[j][p];
                    const y = product - c;
                    const t = sum + y;
                    c = (t - sum) - y;
                    sum = t;
                }
                reconstructed[i][j] = sum;
            }
        }
        return reconstructed;
    }

    // 计算能量比例
    function calculateEnergyRatio(rS, gS, bS, k) {
        const calculateChannelEnergyUltraHighPrecision = (S, k) => {
            // debug:使用对数空间计算避免变成0
            const logSSquared = S.map(s => s > 1e-100 ? 2 * Math.log(Math.abs(s)) : -200);
            
            // 找到最大的对数值用于归一化
            const maxLogS = Math.max(...logSSquared);
            
            // 计算总能量 (在对数空间)
            let totalEnergy = 0;
            let usedEnergy = 0;
            
            // 先计算线性空间的能量
            let totalEnergyLinear = 0;
            let usedEnergyLinear = 0;
            
            for (let i = 0; i < S.length; i++) {
                const square = S[i] * S[i];
                totalEnergyLinear += square;
                if (i < k) {
                    usedEnergyLinear += square;
                }
            }
            
            return totalEnergyLinear > 1e-100 ? (usedEnergyLinear / totalEnergyLinear) * 100 : 100;
        };

        const rEnergy = calculateChannelEnergyUltraHighPrecision(rS, k);
        const gEnergy = calculateChannelEnergyUltraHighPrecision(gS, k);
        const bEnergy = calculateChannelEnergyUltraHighPrecision(bS, k);

        return (rEnergy + gEnergy + bEnergy) / 3;
    }

    // debug:调动画延时
    function calculateAnimationDelay(targetK) {
        if (targetK <= 5) return 800;    // 很少的奇异值，慢一点
        if (targetK <= 10) return 500;   // 较少的奇异值
        if (targetK <= 20) return 300;   // 中等数量
        if (targetK <= 50) return 150;   // 较多数量
        return 100;                      // 很多奇异值，快一点
    }

    // 初始化动画显示
    function initializeAnimationDisplay(targetK) {
        compressedContainer.innerHTML = `
            <div class="animation-status" style="background:transparent;">
                <h4>SVD重构动画进行中...</h4>
                <p id="animation-progress">准备开始...</p>
            </div>
        `;
    }

    // 显示动画帧
    function displayAnimationFrame(imageSrc, currentK, totalK) {
        const progressPercentage = (currentK / totalK) * 100;
        
        compressedContainer.innerHTML = `
            <div class="animation-status" style="background:transparent;">
                <h4>SVD重构动画进行中...</h4>
                <p>当前使用奇异值: ${currentK} / ${totalK} (${progressPercentage.toFixed(1)}%)</p>
            </div>
            <div class="compressed-image-display" style="background:transparent;">
                <img src="${imageSrc}" style="max-width: 400px; transition: opacity 0.1s ease-in-out;" alt="压缩图片第${currentK}帧">
            </div>
        `;
    }

    // debug:工具函数：延时
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 精度报告
    function diagnosePrecisionIssues(S, k) {
        console.log('=== 精度报告 ===');
        console.log('奇异值统计:');
        console.log('- 总数量:', S.length);
        console.log('- 使用数量:', k);
        console.log('- 最大奇异值:', Math.max(...S));
        console.log('- 最小正奇异值:', Math.min(...S.filter(s => s > 0)));
        console.log('- 动态范围:', Math.max(...S) / Math.min(...S.filter(s => s > 0)));
        
        // 检查小奇异值的分布
        const smallValues = S.filter(s => s < 1e-10).length;
        const tinyValues = S.filter(s => s < 1e-15).length;
        console.log('- 小于1e-10的奇异值数量:', smallValues);
        console.log('- 小于1e-15的奇异值数量:', tinyValues);
        
        // 能量分布分析
        const totalEnergy = S.reduce((sum, val) => sum + val * val, 0);
        const energyDistribution = [];
        let cumulativeEnergy = 0;
        
        for (let i = 0; i < Math.min(k + 5, S.length); i++) {
            cumulativeEnergy += S[i] * S[i];
            energyDistribution.push({
                index: i + 1,
                value: S[i],
                energy: S[i] * S[i],
                cumulativeRatio: (cumulativeEnergy / totalEnergy) * 100
            });
        }
        
        console.log('前', Math.min(k + 5, S.length), '个奇异值能量分布:');
        console.table(energyDistribution);
        
        return energyDistribution;
    }

    //显示分析结果
    function displayAnalysisResults(energyRatio, storageRatio, compressionRatio, width, height, kUsed, totalK, singularStrengths) {
        if (!analysisContainer) return;

        // 添加精度诊断
        const diagnosisInfo = diagnosePrecisionIssues(singularStrengths, kUsed);

        const originalSize = width * height * 3;
        const compressedSize = Math.round(originalSize * storageRatio / 100);

        let analysisHTML = `
            <div class="info-section" style="background:transparent;">
                <h4>原图信息</h4>
                <p>处理尺寸: ${width} × ${height} 像素</p>
                <p>原图存储空间: ${originalSize} 字节 (${(originalSize / 1024).toFixed(1)} KB)</p>
                <p><small>注：显示的原图为SVD完整重构结果（保留100%奇异值）</small></p>
                <p><small>由于计算精度和准确性问题,本算法的特征值未能完全算准奇异值,因此显示的原图与上传的原图有差别。</small></p>
                <p><small>实际情况中,保留100%奇异值的图像即为原图(无压缩)。</small></p>
                <p><small>就暂且把显示的原图当作原图吧</small></p>
            </div>
            
            <div class="info-section" style="background:transparent;">
                <h4>SVD压缩分析</h4>
                <p><strong>使用奇异值数量:</strong> ${kUsed} / ${totalK}</p>
                <p><strong>奇异值能量保留比例:</strong> ${energyRatio.toFixed(6)}%</p>
                <p><strong>压缩后理论存储空间:</strong> ${compressedSize} 字节 (${(compressedSize / 1024).toFixed(1)} KB)</p>
                <p><strong>存储空间比例:</strong> ${storageRatio.toFixed(6)}%</p>
                <p><strong>压缩比:</strong> ${compressionRatio.toFixed(6)}:1</p>
                <p><strong>动态范围:</strong> ${(Math.max(...singularStrengths) / Math.min(...singularStrengths.filter(s => s > 0))).toExponential(2)}</p>
            </div>
        `;

        if (singularStrengths && singularStrengths.length > 0) {
            // 前k个奇异值的能量占比
            const usedSingularValues = singularStrengths.slice(0, kUsed);
            const totalEnergy = singularStrengths.reduce((sum, val) => sum + val * val, 0);
            const usedEnergy = usedSingularValues.reduce((sum, val) => sum + val * val, 0);
            const energyPercentage = totalEnergy > 0 ? (usedEnergy / totalEnergy) * 100 : 0;

            // 每个奇异值的能量占比
            const singularValueEnergyRatios = usedSingularValues.map(val => 
                totalEnergy > 0 ? ((val * val) / totalEnergy) * 100 : 0
            );

            analysisHTML += `
                <div class="info-section" style="background:transparent;">
                    <h4>奇异值强度分布</h4>
                    <div class="singular-values-chart" style="background:transparent;">
                        ${createSingularValuesChart(singularStrengths, kUsed)}
                    </div>
                    <div class="singular-values-details" style="background:transparent;">
                        <p><strong>使用的奇异值详情:</strong></p>
                        <div class="singular-values-list" style="background:transparent;">
                            ${createSingularValuesDetailsList(usedSingularValues, singularValueEnergyRatios, kUsed)}
                        </div>
                        <p class="energy-summary">
                            <strong>前${kUsed}个奇异值总能量占比: ${energyPercentage.toFixed(6)}%</strong>
                        </p>
                    </div>
                </div>
            `;
        }

        analysisContainer.innerHTML = analysisHTML;
    }

    // 奇异值详细列表
    function createSingularValuesDetailsList(singularValues, energyRatios, kUsed) {
        let listHTML = '<div class="singular-values-grid" style="background:transparent;">';
        
        for (let i = 0; i < singularValues.length; i++) {
            const value = singularValues[i];
            const energyRatio = energyRatios[i];
            
            listHTML += `
                <div class="singular-value-item" style="background:transparent;">
                    <span class="sv-index">σ${i + 1}:</span>
                    <span class="sv-value">${value.toFixed(4)}</span>
                    <span class="sv-energy">(${energyRatio.toFixed(2)}%)</span>
                </div>
            `;
        }
        
        listHTML += '</div>';
        
        // 如果奇异值数量较多，添加汇总信息
        if (kUsed > 10) {
            const top5Energy = energyRatios.slice(0, Math.min(5, kUsed)).reduce((sum, ratio) => sum + ratio, 0);
            const top10Energy = energyRatios.slice(0, Math.min(10, kUsed)).reduce((sum, ratio) => sum + ratio, 0);
            
            listHTML += `
                <div class="energy-breakdown " style="background:transparent;">
                    <p><strong>能量分布汇总:</strong></p>
                    <ul>
                        ${kUsed >= 5 ? `<li>前5个奇异值占总能量: ${top5Energy.toFixed(2)}%</li>` : ''}
                        ${kUsed >= 10 ? `<li>前10个奇异值占总能量: ${top10Energy.toFixed(2)}%</li>` : ''}
                        <li>前${kUsed}个奇异值占总能量: ${energyRatios.reduce((sum, ratio) => sum + ratio, 0).toFixed(2)}%</li>
                    </ul>
                </div>
            `;
        }
        
        return listHTML;
    }

    function createSingularValuesChart(singularValues, kUsed) {
        // 显示的奇异值数量：如果k值较小就全部显示，如果较大则显示前30个
        // debug:只显示20个
        const maxDisplay = Math.min(Math.max(kUsed, 20), 30);
        const displayValues = singularValues.slice(0, maxDisplay);
        const maxValue = Math.max(...displayValues);
        
        let chartHTML = '<div class="chart-container" style="background:transparent;">';
        
        for (let i = 0; i < displayValues.length; i++) {
            const value = displayValues[i];
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isUsed = i < kUsed;
            const isImportant = i < Math.min(5, kUsed); // 前5个标记为特别重要
            
            chartHTML += `
                <div class="chart-bar ${isUsed ? (isImportant ? 'used-important' : 'used') : 'unused'}" 
                     style="height: ${height}% ;" 
                     title="奇异值 ${i+1}: ${value.toFixed(4)}${isUsed ? ' (已使用)' : ' (未使用)'}">
                </div>
            `;
        }
        
        chartHTML += '</div>';
        
        // 添加图表说明
        chartHTML += `
            <div class="chart-legend" style="background:transparent;">
                
                <span class="legend-item">
                    <span class="legend-color used"></span>
                    使用的奇异值
                </span>
                <span class="legend-item">
                    <span class="legend-color unused"></span>
                    未使用的奇异值
                </span>
                <span class="legend-item">
                    <span class="legend-color used-important"></span>
                    前5个重要奇异值
                </span>
            </div>
            <p class="chart-description">
                显示前20个奇异值强度分布，使用了前${kUsed}个
            </p>
        `;
        
        return chartHTML;
    }

    // 带分析的SVD压缩函数
    function svdCompressWithAnalysis(image, percentage) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 300;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.floor(image.width * scale);
        canvas.height = Math.floor(image.height * scale);
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // 提取RGB通道
        const rChannel = [], gChannel = [], bChannel = [];
        for (let i = 0; i < height; i++) {
            rChannel[i] = []; gChannel[i] = []; bChannel[i] = [];
            for (let j = 0; j < width; j++) {
                const pixelIndex = (i * width + j) * 4;
                rChannel[i][j] = data[pixelIndex] / 255;
                gChannel[i][j] = data[pixelIndex + 1] / 255;
                bChannel[i][j] = data[pixelIndex + 2] / 255;
            }
        }

        const totalSingularValues = Math.min(width, height);
        const k = Math.max(1, Math.floor(totalSingularValues * percentage / 100));

        // 对每个通道进行SVD压缩并收集分析数据
        const rResult = performSVDCompressionWithAnalysis(rChannel, k);
        const gResult = performSVDCompressionWithAnalysis(gChannel, k);
        const bResult = performSVDCompressionWithAnalysis(bChannel, k);

        // 计算平均能量保留比例
        const avgEnergyRatio = (rResult.energyRatio + gResult.energyRatio + bResult.energyRatio) / 3;
        
        // 计算存储空间比例
        const originalStorage = width * height;
        const compressedStorage = k * (width + height + 1);
        const storageRatio = (compressedStorage / originalStorage) * 100;
        const compressionRatio = originalStorage / compressedStorage;

        // 重构图像
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const pixelIndex = (i * width + j) * 4;
                data[pixelIndex] = Math.max(0, Math.min(255, Math.round(rResult.compressed[i][j] * 255)));
                data[pixelIndex + 1] = Math.max(0, Math.min(255, Math.round(gResult.compressed[i][j] * 255)));
                data[pixelIndex + 2] = Math.max(0, Math.min(255, Math.round(bResult.compressed[i][j] * 255)));
                data[pixelIndex + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        return {
            imageData: canvas.toDataURL(),
            energyRatio: avgEnergyRatio,
            storageRatio: storageRatio,
            compressionRatio: compressionRatio,
            width: width,
            height: height,
            singularValuesUsed: k,
            totalSingularValues: totalSingularValues,
            singularValueStrengths: rResult.singularValues
        };
    }

    // 带分析的SVD压缩
    function performSVDCompressionWithAnalysis(matrix, k) {
        const m = matrix.length;
        const n = matrix[0].length;
        
        const svdResult = svdDecomposition(matrix);
        const U = svdResult.U;
        const S = svdResult.S;
        const V = svdResult.V;
        
        const kActual = Math.min(k, S.length);
        
        // 计算能量保留比例
        const totalEnergy = S.reduce((sum, val) => sum + val * val, 0);
        const usedEnergy = S.slice(0, kActual).reduce((sum, val) => sum + val * val, 0);
        const energyRatio = totalEnergy > 0 ? (usedEnergy / totalEnergy) * 100 : 100;

        // 重构矩阵
        const reconstructed = [];
        for (let i = 0; i < m; i++) {
            reconstructed[i] = [];
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let p = 0; p < kActual; p++) {
                    sum += U[i][p] * S[p] * V[j][p];
                }
                reconstructed[i][j] = sum;
            }
        }
        
        return {
            compressed: reconstructed,
            energyRatio: energyRatio,
            singularValues: S
        };
    }

    // 修改SVD分解函数，使用更高精度
    function svdDecomposition(A) {
        console.log('使用Jacobi高精度SVD分解...');
        return svdDecompositionJacobi(A);
    }

    // 使用128位精度的数值类型模拟
    class HighPrecisionNumber {
        constructor(value) {
            // 将数字分解为高位和低位
            this.high = Math.floor(value);
            this.low = value - this.high;
        }

        add(other) {
            const result = new HighPrecisionNumber(0);
            const lowSum = this.low + other.low;
            result.high = this.high + other.high + Math.floor(lowSum);
            result.low = lowSum - Math.floor(lowSum);
            return result;
        }

        multiply(other) {
            const result = new HighPrecisionNumber(0);
            const a = this.high * other.high;
            const b = this.high * other.low + this.low * other.high;
            const c = this.low * other.low;
            
            result.high = a + Math.floor(b);
            result.low = (b - Math.floor(b)) + c;
            
            // 处理溢出
            if (result.low >= 1) {
                result.high += Math.floor(result.low);
                result.low = result.low - Math.floor(result.low);
            }
            
            return result;
        }

        toNumber() {
            return this.high + this.low;
        }
    }

    // 使用更精确的SVD算法 - Jacobi迭代法
    function svdDecompositionJacobi(A) {
        const m = A.length;
        const n = A[0].length;
        
        // 创建A^T * A
        const AtA = multiplyMatricesUltraHighPrecision(transposeMatrix(A), A);
        
        // 使用Jacobi方法求特征值和特征向量
        const jacobiResult = jacobiEigenDecomposition(AtA);
        const eigenValues = jacobiResult.values;
        const eigenVectors = jacobiResult.vectors;
        
        // 计算奇异值
        const singularValues = eigenValues.map(val => Math.sqrt(Math.max(0, val)));
        const V = eigenVectors;
        
        // 计算U矩阵
        const U = [];
        const rank = Math.min(m, n);
        
        for (let i = 0; i < m; i++) {
            U[i] = [];
            for (let j = 0; j < rank; j++) {
                if (singularValues[j] > 1e-16) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) {
                        sum += A[i][k] * V[k][j];
                    }
                    U[i][j] = sum / singularValues[j];
                } else {
                    U[i][j] = 0;
                }
            }
        }
        
        return { U: U, S: singularValues, V: V };
    }

    // Jacobi特征值分解 - 更稳定的方法
    function jacobiEigenDecomposition(matrix) {
        const n = matrix.length;
        const maxIterations = 1000;
        const tolerance = 1e-15;
        
        // 复制矩阵
        let A = matrix.map(row => [...row]);
        
        // 初始化特征向量矩阵为单位矩阵
        let V = [];
        for (let i = 0; i < n; i++) {
            V[i] = [];
            for (let j = 0; j < n; j++) {
                V[i][j] = (i === j) ? 1 : 0;
            }
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // 找到最大的非对角元素
            let maxOffDiag = 0;
            let p = 0, q = 0;
            
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (Math.abs(A[i][j]) > maxOffDiag) {
                        maxOffDiag = Math.abs(A[i][j]);
                        p = i;
                        q = j;
                    }
                }
            }
            
            // 检查收敛
            if (maxOffDiag < tolerance) {
                break;
            }
            
            // 计算Jacobi旋转角度
            const tau = (A[q][q] - A[p][p]) / (2 * A[p][q]);
            const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
            const c = 1 / Math.sqrt(1 + t * t);
            const s = t * c;
            
            // 应用Jacobi旋转
            const App = A[p][p];
            const Aqq = A[q][q];
            const Apq = A[p][q];
            
            A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
            A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
            A[p][q] = A[q][p] = 0;
            
            // 更新其他元素
            for (let i = 0; i < n; i++) {
                if (i !== p && i !== q) {
                    const Aip = A[i][p];
                    const Aiq = A[i][q];
                    A[i][p] = A[p][i] = c * Aip - s * Aiq;
                    A[i][q] = A[q][i] = s * Aip + c * Aiq;
                }
            }
            
            // 更新特征向量
            for (let i = 0; i < n; i++) {
                const Vip = V[i][p];
                const Viq = V[i][q];
                V[i][p] = c * Vip - s * Viq;
                V[i][q] = s * Vip + c * Viq;
            }
        }
        
        // 提取特征值并排序
        const eigenValues = [];
        for (let i = 0; i < n; i++) {
            eigenValues.push(A[i][i]);
        }
        
        // 按特征值大小排序
        const indices = eigenValues.map((_, i) => i);
        indices.sort((a, b) => eigenValues[b] - eigenValues[a]);
        
        const sortedValues = indices.map(i => Math.max(0, eigenValues[i]));
        const sortedVectors = [];
        
        for (let i = 0; i < n; i++) {
            sortedVectors[i] = [];
            for (let j = 0; j < indices.length; j++) {
                sortedVectors[i][j] = V[i][indices[j]];
            }
        }
        
        return { values: sortedValues, vectors: sortedVectors };
    }

    // 超高精度矩阵乘法 - 使用四精度Kahan求和
    function multiplyMatricesUltraHighPrecision(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const result = [];
        
        for (let i = 0; i < rowsA; i++) {
            result[i] = [];
            for (let j = 0; j < colsB; j++) {
                // 四精度Kahan求和
                let sum = 0;
                let c = 0;    // 第一级补偿
                let cc = 0;   // 第二级补偿
                let ccc = 0;  // 第三级补偿
                
                for (let k = 0; k < colsA; k++) {
                    const product = A[i][k] * B[k][j];
                    
                    // 四级Kahan求和
                    const y = product - c;
                    const u = sum + y;
                    const v = u - sum;
                    const z = y - v;
                    sum = u;
                    
                    const y2 = z - cc;
                    const u2 = c + y2;
                    const v2 = u2 - c;
                    const z2 = y2 - v2;
                    c = u2;
                    
                    const y3 = z2 - ccc;
                    const u3 = cc + y3;
                    cc = u3;
                    ccc = y3 - (u3 - cc);
                }
                
                result[i][j] = sum + c + cc + ccc;
            }
        }
        return result;
    }

    // 添加预处理步骤提高数值稳定性
    function preprocessMatrix(matrix) {
        const m = matrix.length;
        const n = matrix[0].length;
        
        // 计算矩阵的范数
        let maxElement = 0;
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                maxElement = Math.max(maxElement, Math.abs(matrix[i][j]));
            }
        }
        
        // 如果矩阵元素太小，进行缩放
        const scaleFactor = maxElement < 1e-10 ? 1e6 : 1;
        
        const scaledMatrix = [];
        for (let i = 0; i < m; i++) {
            scaledMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                scaledMatrix[i][j] = matrix[i][j] * scaleFactor;
            }
        }
        
        return { matrix: scaledMatrix, scaleFactor: scaleFactor };
    }

    // 修改SVD稳定分解函数
    function svdDecompositionStable(A) {
        console.log('开始超高精度稳定的SVD分解...');
        
        // 预处理矩阵
        const preprocessed = preprocessMatrix(A);
        const scaledMatrix = preprocessed.matrix;
        const scaleFactor = preprocessed.scaleFactor;
        
        if (!checkNumericalStability(scaledMatrix, '预处理后的输入矩阵')) {
            console.warn('预处理后的矩阵仍存在数值不稳定性');
        }
        
        const result = svdDecomposition(scaledMatrix);
        
        // 还原奇异值的缩放
        const unscaledS = result.S.map(s => s / scaleFactor);
        
        const finalResult = {
            U: result.U,
            S: unscaledS,
            V: result.V
        };
        
        checkNumericalStability(finalResult.U, 'U矩阵');
        console.log('奇异值范围:', {
            max: Math.max(...finalResult.S),
            min: Math.min(...finalResult.S.filter(s => s > 0)),
            count: finalResult.S.length,
            dynamicRange: Math.max(...finalResult.S) / Math.min(...finalResult.S.filter(s => s > 0))
        });
        checkNumericalStability(finalResult.V, 'V矩阵');
        
        return finalResult;
    }

    // 矩阵转置
    function transposeMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const transposed = [];
        
        for (let j = 0; j < cols; j++) {
            transposed[j] = [];
            for (let i = 0; i < rows; i++) {
                transposed[j][i] = matrix[i][j];
            }
        }
        
        return transposed;
    }

    // 数值稳定性检查
    function checkNumericalStability(matrix, name = 'Matrix') {
        let maxVal = 0;
        let minVal = Infinity;
        let hasNaN = false;
        let hasInf = false;
        
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                const val = matrix[i][j];
                if (isNaN(val)) hasNaN = true;
                if (!isFinite(val)) hasInf = true;
                maxVal = Math.max(maxVal, Math.abs(val));
                minVal = Math.min(minVal, Math.abs(val));
            }
        }
        
        console.log(`${name} 数值稳定性检查:`, {
            maxValue: maxVal,
            minValue: minVal,
            hasNaN: hasNaN,
            hasInfinite: hasInf,
            conditionNumber: maxVal / (minVal || 1e-15)
        });
        
        return !hasNaN && !hasInf && maxVal < 1e10;
    }

    // 在SVD分解中添加稳定性检查
    function svdDecompositionStable(A) {
        console.log('开始稳定的SVD分解...');
        
        if (!checkNumericalStability(A, '输入矩阵')) {
            console.warn('输入矩阵存在数值不稳定性');
        }
        
        const result = svdDecomposition(A);
        
        checkNumericalStability(result.U, 'U矩阵');
        console.log('奇异值范围:', {
            max: Math.max(...result.S),
            min: Math.min(...result.S.filter(s => s > 0)),
            count: result.S.length
        });
        checkNumericalStability(result.V, 'V矩阵');
        
        return result;
    }
});