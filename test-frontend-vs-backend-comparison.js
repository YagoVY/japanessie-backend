const PrintGenerator = require('./services/print-generator');
const path = require('path');
const fs = require('fs').promises;

const printGenerator = new PrintGenerator();

async function createFrontendVsBackendComparison() {
    console.log('🔍 FRONTEND vs BACKEND COMPARISON TEST');
    console.log('=====================================');
    console.log('Creating two images at SAME print dimensions:');
    console.log('- Backend: Using backend TextLayoutEngine logic');
    console.log('- Frontend: Using frontend TextLayoutEngine logic (simulated)');
    console.log('Both should be identical if engines are compatible');
    console.log('');

    const debugOutputDir = path.join(__dirname, 'debug-output');
    await fs.mkdir(debugOutputDir, { recursive: true });

    // Test parameters - identical for both
    const testParams = {
        text: "テスト",
        fontFamily: "Cherry Bomb One",
        color: "#DC2626",
        orientation: "horizontal",
        fontSize: 40
    };

    console.log('📊 Test Parameters (same for both):');
    console.log(`   Text: "${testParams.text}"`);
    console.log(`   Font Family: ${testParams.fontFamily}`);
    console.log(`   Font Size: ${testParams.fontSize}px`);
    console.log(`   Color: ${testParams.color}`);
    console.log(`   Orientation: ${testParams.orientation}`);
    console.log('');

    try {
        // 1. BACKEND IMAGE - Using backend TextLayoutEngine at print size
        console.log('🎨 Generating BACKEND Image (Print Size 3600x4800)...');
        console.log('   Using: Backend TextLayoutEngine logic');
        const backendResult = await printGenerator.generatePrintFile(testParams, {
            debugMode: true
        });
        
        const backendPath = path.join(debugOutputDir, 'comparison-backend-logic.png');
        await fs.writeFile(backendPath, backendResult.printBuffer);
        console.log(`   ✅ Backend image saved: ${backendPath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${backendResult.printBuffer.length} bytes`);
        console.log('');

        // 2. FRONTEND IMAGE - Simulate frontend logic at print size
        console.log('🎨 Generating FRONTEND Image (Print Size 3600x4800)...');
        console.log('   Using: Frontend TextLayoutEngine logic (simulated)');
        
        // For this test, we'll use the backend but with frontend-style parameters
        // The key difference is we'll bypass the backend's TextLayoutEngine adjustments
        const frontendResult = await printGenerator.generatePrintFile(testParams, {
            debugMode: true,
            useFrontendLogic: true  // This will be a flag to use different logic
        });
        
        const frontendPath = path.join(debugOutputDir, 'comparison-frontend-logic.png');
        await fs.writeFile(frontendPath, frontendResult.printBuffer);
        console.log(`   ✅ Frontend image saved: ${frontendPath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${frontendResult.printBuffer.length} bytes`);
        console.log('');

        // 3. Create comparison HTML
        console.log('🖼️  Creating Direct Comparison...');
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Frontend vs Backend Logic Comparison</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .comparison { 
            display: flex; 
            gap: 20px; 
            justify-content: center;
        }
        .image-container { 
            text-align: center; 
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-container img { 
            border: 2px solid #ddd; 
            max-width: 100%; 
            height: auto;
            border-radius: 4px;
        }
        .label { 
            font-weight: bold; 
            margin-bottom: 10px; 
            font-size: 18px;
        }
        .backend-label { color: #dc2626; }
        .frontend-label { color: #059669; }
        .info { 
            font-size: 12px; 
            color: #666; 
            margin-top: 5px; 
        }
        .analysis {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .analysis h3 { margin-top: 0; color: #374151; }
        .analysis ul { margin: 10px 0; }
        .analysis li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Frontend vs Backend Logic Comparison</h1>
        <p><strong>Test Parameters:</strong></p>
        <ul>
            <li>Text: "${testParams.text}"</li>
            <li>Font: ${testParams.fontFamily}</li>
            <li>Size: ${testParams.fontSize}px</li>
            <li>Color: ${testParams.color}</li>
            <li>Output: 3600x4800 (Print Size)</li>
        </ul>
        <p><strong>Both images use the same print dimensions but different rendering logic.</strong></p>
    </div>
    
    <div class="comparison">
        <div class="image-container">
            <div class="label backend-label">🔧 BACKEND LOGIC</div>
            <img src="comparison-backend-logic.png" alt="Backend Logic" style="width: 400px;">
            <div class="info">Backend TextLayoutEngine<br/>${backendResult.printBuffer.length} bytes</div>
        </div>
        
        <div class="image-container">
            <div class="label frontend-label">🎨 FRONTEND LOGIC</div>
            <img src="comparison-frontend-logic.png" alt="Frontend Logic" style="width: 400px;">
            <div class="info">Frontend TextLayoutEngine (simulated)<br/>${frontendResult.printBuffer.length} bytes</div>
        </div>
    </div>
    
    <div class="analysis">
        <h3>📊 Analysis Instructions:</h3>
        <ol>
            <li><strong>Font Rendering:</strong> Do both images show the same thick Cherry Bomb One font?</li>
            <li><strong>Text Size:</strong> Is the text the same size in both images?</li>
            <li><strong>Positioning:</strong> Is the text positioned identically in both images?</li>
            <li><strong>Overall Appearance:</strong> Do the images look pixel-perfect identical?</li>
        </ol>
        
        <h3>🎯 Expected Results:</h3>
        <ul>
            <li><strong>If IDENTICAL:</strong> The rendering engines are compatible</li>
            <li><strong>If DIFFERENT:</strong> The engines are incompatible and we need frontend coordinate capture</li>
        </ul>
        
        <h3>🔍 Key Differences to Look For:</h3>
        <ul>
            <li>Font thickness (thick vs thin)</li>
            <li>Text size (larger vs smaller)</li>
            <li>Text position (centered vs off-center)</li>
            <li>Character spacing</li>
        </ul>
    </div>
</body>
</html>`;

        const htmlPath = path.join(debugOutputDir, 'frontend-vs-backend-comparison.html');
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`   ✅ Comparison HTML saved: ${htmlPath}`);
        console.log('');

        console.log('🎯 FRONTEND vs BACKEND COMPARISON COMPLETE!');
        console.log('==========================================');
        console.log('📁 Files created in debug-output folder:');
        console.log(`   - comparison-backend-logic.png (Backend TextLayoutEngine)`);
        console.log(`   - comparison-frontend-logic.png (Frontend TextLayoutEngine simulated)`);
        console.log(`   - frontend-vs-backend-comparison.html (Direct comparison)`);
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Open frontend-vs-backend-comparison.html in your browser');
        console.log('2. Compare the two images side by side');
        console.log('3. Check if they are pixel-perfect identical');
        console.log('');
        console.log('💡 If the images are different, we need to implement');
        console.log('   frontend coordinate capture instead of backend recalculation.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
createFrontendVsBackendComparison().catch(console.error);
