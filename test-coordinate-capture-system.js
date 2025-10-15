const CoordinateScalingGenerator = require('./services/coordinate-scaling-generator');
const path = require('path');
const fs = require('fs').promises;

const coordinateGenerator = new CoordinateScalingGenerator();

async function testCoordinateCaptureSystem() {
    console.log('🎯 TESTING COORDINATE CAPTURE SYSTEM');
    console.log('====================================');
    console.log('Testing the new frontend coordinate capture + backend scaling architecture');
    console.log('');

    const debugOutputDir = path.join(__dirname, 'debug-output');
    await fs.mkdir(debugOutputDir, { recursive: true });

    // Test parameters
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
    console.log('');

    try {
        // Step 1: Convert legacy params to coordinate format
        console.log('🔄 Step 1: Converting legacy params to coordinate format...');
        const coordinateData = coordinateGenerator.convertLegacyToCoordinates(testParams);
        
        console.log('   ✅ Coordinate data created:');
        console.log(`   📍 Character count: ${coordinateData.characterPositions.length}`);
        console.log(`   📏 Frontend canvas: ${coordinateData.frontendCanvasSize.width}x${coordinateData.frontendCanvasSize.height}`);
        console.log(`   🎯 Total width: ${coordinateData.totalWidth}px`);
        console.log('');

        // Step 2: Generate print file using coordinate scaling
        console.log('🎨 Step 2: Generating print file with coordinate scaling...');
        console.log('   Expected: Uniform 16x scaling (8x base × 2x fix)');
        console.log('   Font size: 40px × 16 = 640px');
        console.log('   Positions: Scaled uniformly by 16x');
        
        const result = await coordinateGenerator.generatePrintFromCoordinates(coordinateData, {
            debugMode: true
        });
        
        const filePath = path.join(debugOutputDir, 'coordinate-capture-test.png');
        await fs.writeFile(filePath, result.printBuffer);
        console.log(`   ✅ Print file saved: ${filePath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${result.printBuffer.length} bytes`);
        console.log('');

        // Step 3: Create detailed analysis
        console.log('📊 Step 3: Creating detailed analysis...');
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Coordinate Capture System Test</title>
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
        .image-container { 
            text-align: center; 
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
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
            color: #059669;
        }
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
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .analysis h3 { margin-top: 0; color: #374151; }
        .analysis ul { margin: 10px 0; }
        .analysis li { margin: 5px 0; }
        .highlight { background: #fef3c7; padding: 2px 4px; border-radius: 3px; }
        .coordinate-data {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Coordinate Capture System Test</h1>
        <p><strong>New Architecture:</strong> Frontend coordinate capture + Backend uniform scaling</p>
        <p><strong>Test Parameters:</strong></p>
        <ul>
            <li>Text: "${testParams.text}"</li>
            <li>Font: ${testParams.fontFamily}</li>
            <li>Size: ${testParams.fontSize}px</li>
            <li>Color: ${testParams.color}</li>
            <li>Output: 3600x4800 (Print Size)</li>
        </ul>
    </div>
    
    <div class="image-container">
        <div class="label">✅ COORDINATE CAPTURE SYSTEM</div>
        <img src="coordinate-capture-test.png" alt="Coordinate Capture Test" style="width: 400px;">
        <div class="info">Uniform 16x scaling (8x base × 2x fix)<br/>${result.printBuffer.length} bytes</div>
    </div>
    
    <div class="analysis">
        <h3>📊 Coordinate Data Captured:</h3>
        <div class="coordinate-data">
            <strong>Frontend Canvas:</strong> ${coordinateData.frontendCanvasSize.width}x${coordinateData.frontendCanvasSize.height}<br/>
            <strong>Character Count:</strong> ${coordinateData.characterPositions.length}<br/>
            <strong>Total Width:</strong> ${coordinateData.totalWidth}px<br/>
            <strong>Total Height:</strong> ${coordinateData.totalHeight}px<br/>
            <br/>
            <strong>Character Positions:</strong><br/>
            ${coordinateData.characterPositions.map((char, i) => 
                `${i}: "${char.char}" at (${char.x}, ${char.y}) width=${char.width}px`
            ).join('<br/>')}
        </div>
        
        <h3>🔧 Scaling Calculations:</h3>
        <ul>
            <li><strong>Base Scale X:</strong> 3600 ÷ 600 = 6x</li>
            <li><strong>Base Scale Y:</strong> 4800 ÷ 600 = 8x</li>
            <li><strong>Uniform Scale Factor:</strong> max(6,8) × 2 = <span class="highlight">16x</span></li>
            <li><strong>Font Size:</strong> 40px × 16 = <span class="highlight">640px</span></li>
            <li><strong>Position Scaling:</strong> All coordinates × 16</li>
        </ul>
        
        <h3>🎯 Expected Results:</h3>
        <ul>
            <li>✅ <strong>Uniform Scaling:</strong> Everything scales by the same 16x factor</li>
            <li>✅ <strong>Correct Font Size:</strong> 640px matches your 2x manual fix</li>
            <li>✅ <strong>Proper Positioning:</strong> Characters maintain proportional relationships</li>
            <li>✅ <strong>No Layout Engine:</strong> Uses frontend coordinates directly</li>
        </ul>
        
        <h3>🔍 How to Verify:</h3>
        <ol>
            <li>Upload this print file to Printful</li>
            <li>View at <strong>normal scale</strong> (no manual 2x scaling needed)</li>
            <li>Compare with your frontend preview</li>
            <li>Text should match exactly in size and position</li>
        </ol>
        
        <h3>💡 Architecture Benefits:</h3>
        <ul>
            <li>🎯 <strong>Frontend Authority:</strong> Uses working frontend as source of truth</li>
            <li>🔧 <strong>Pure Scaling:</strong> Backend just scales, doesn't recalculate</li>
            <li>📐 <strong>Uniform Scaling:</strong> Everything scales by same factor</li>
            <li>🚫 <strong>No Environment Issues:</strong> Eliminates browser vs headless differences</li>
        </ul>
    </div>
</body>
</html>`;

        const htmlPath = path.join(debugOutputDir, 'coordinate-capture-test.html');
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`   ✅ Analysis HTML saved: ${htmlPath}`);
        console.log('');

        console.log('🎯 COORDINATE CAPTURE SYSTEM TEST COMPLETE!');
        console.log('===========================================');
        console.log('📁 Files created in debug-output folder:');
        console.log(`   - coordinate-capture-test.png (Print file with uniform 16x scaling)`);
        console.log(`   - coordinate-capture-test.html (Detailed analysis)`);
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Open coordinate-capture-test.html to view the analysis');
        console.log('2. Upload the PNG to Printful and test at normal scale');
        console.log('3. Compare with your frontend preview');
        console.log('4. Verify uniform scaling works correctly');
        console.log('');
        console.log('💡 Expected Result:');
        console.log('   Font size: 640px (40px × 16)');
        console.log('   Positions: All coordinates scaled by 16x');
        console.log('   Should match frontend preview without manual scaling');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testCoordinateCaptureSystem().catch(console.error);
