const PrintGenerator = require('./services/print-generator');
const path = require('path');
const fs = require('fs').promises;

const printGenerator = new PrintGenerator();

async function createIdenticalRenderingTest() {
    console.log('🔍 TEST 1: Identical Rendering Comparison');
    console.log('==========================================');
    console.log('Testing: Frontend vs Backend at identical settings');
    console.log('Text: "テスト"');
    console.log('Font: Cherry Bomb One 40px');
    console.log('Canvas: 600x600 (frontend size)');
    console.log('Color: #DC2626');
    console.log('');

    const debugOutputDir = path.join(__dirname, 'debug-output');
    await fs.mkdir(debugOutputDir, { recursive: true });

    // Test parameters - identical to what frontend would use
    const testParams = {
        text: "テスト",
        fontFamily: "Cherry Bomb One",
        color: "#DC2626",
        orientation: "horizontal",
        fontSize: 40
    };

    console.log('📊 Test Parameters:');
    console.log(`   Text: "${testParams.text}"`);
    console.log(`   Font Family: ${testParams.fontFamily}`);
    console.log(`   Font Size: ${testParams.fontSize}px`);
    console.log(`   Color: ${testParams.color}`);
    console.log(`   Orientation: ${testParams.orientation}`);
    console.log('');

    try {
        // Generate backend render at 600x600 (same as frontend)
        console.log('🎨 Generating Backend Render (600x600)...');
        const backendResult = await printGenerator.generatePrintFile(testParams, {
            canvasSize: { width: 600, height: 600 },
            debugMode: true
        });
        
        const backendPath = path.join(debugOutputDir, 'identical-test-backend-600x600.png');
        await fs.writeFile(backendPath, backendResult.printBuffer);
        console.log(`   ✅ Backend render saved: ${backendPath}`);
        console.log(`   📏 Dimensions: 600x600`);
        console.log(`   📦 Size: ${backendResult.printBuffer.length} bytes`);
        console.log('');

        // Generate backend render at print size (3600x4800) for comparison
        console.log('🎨 Generating Backend Render (3600x4800 - Print Size)...');
        const printResult = await printGenerator.generatePrintFile(testParams, {
            debugMode: true
        });
        
        const printPath = path.join(debugOutputDir, 'identical-test-backend-3600x4800.png');
        await fs.writeFile(printPath, printResult.printBuffer);
        console.log(`   ✅ Print render saved: ${printPath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${printResult.printBuffer.length} bytes`);
        console.log('');

        // Create a side-by-side comparison image
        console.log('🖼️  Creating Side-by-Side Comparison...');
        const comparisonPath = path.join(debugOutputDir, 'identical-rendering-comparison.png');
        
        // For now, we'll create a simple HTML file that displays both images side by side
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Identical Rendering Comparison</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .comparison { display: flex; gap: 20px; }
        .image-container { text-align: center; }
        .image-container img { border: 2px solid #ccc; max-width: 100%; }
        .label { font-weight: bold; margin-bottom: 10px; }
        .info { font-size: 12px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Identical Rendering Comparison Test</h1>
    <p><strong>Test Parameters:</strong></p>
    <ul>
        <li>Text: "${testParams.text}"</li>
        <li>Font: ${testParams.fontFamily}</li>
        <li>Size: ${testParams.fontSize}px</li>
        <li>Color: ${testParams.color}</li>
        <li>Canvas: 600x600 (frontend size)</li>
    </ul>
    
    <div class="comparison">
        <div class="image-container">
            <div class="label">Backend Render (600x600)</div>
            <img src="identical-test-backend-600x600.png" alt="Backend 600x600">
            <div class="info">Same canvas size as frontend</div>
        </div>
        
        <div class="image-container">
            <div class="label">Backend Render (3600x4800)</div>
            <img src="identical-test-backend-3600x4800.png" alt="Backend 3600x4800" style="width: 300px;">
            <div class="info">Print size (scaled down for display)</div>
        </div>
    </div>
    
    <h2>Analysis Instructions:</h2>
    <ol>
        <li><strong>Font Rendering:</strong> Does the 600x600 version show the thick Cherry Bomb One font?</li>
        <li><strong>Size Consistency:</strong> Is the text size proportional between 600x600 and 3600x4800?</li>
        <li><strong>Positioning:</strong> Is the text centered in both versions?</li>
        <li><strong>Font Loading:</strong> Are the fonts actually loading (thick vs thin appearance)?</li>
    </ol>
    
    <p><strong>Expected Result:</strong> Both images should show identical text rendering, just at different scales.</p>
    <p><strong>If Different:</strong> The rendering engines are incompatible and we need to capture frontend coordinates.</p>
</body>
</html>`;

        const htmlPath = path.join(debugOutputDir, 'identical-rendering-comparison.html');
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`   ✅ Comparison HTML saved: ${htmlPath}`);
        console.log('');

        console.log('🎯 IDENTICAL RENDERING TEST COMPLETE!');
        console.log('=====================================');
        console.log('📁 Files created in debug-output folder:');
        console.log(`   - identical-test-backend-600x600.png (Backend at frontend size)`);
        console.log(`   - identical-test-backend-3600x4800.png (Backend at print size)`);
        console.log(`   - identical-rendering-comparison.html (Side-by-side comparison)`);
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Open identical-rendering-comparison.html in your browser');
        console.log('2. Compare the two backend renders');
        console.log('3. Check if fonts are loading properly (thick vs thin)');
        console.log('4. Verify text positioning and sizing');
        console.log('');
        console.log('💡 If the 600x600 version looks different from your frontend preview,');
        console.log('   the rendering engines are incompatible and we need to capture');
        console.log('   frontend coordinates instead of recalculating in backend.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
createIdenticalRenderingTest().catch(console.error);
