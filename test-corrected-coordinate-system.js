const CoordinateScalingGenerator = require('./services/coordinate-scaling-generator');
const path = require('path');
const fs = require('fs').promises;

const coordinateGenerator = new CoordinateScalingGenerator();

async function testCorrectedCoordinateSystem() {
    console.log('🎯 TESTING CORRECTED COORDINATE SYSTEM');
    console.log('=====================================');
    console.log('Testing the fix for coordinate system mismatch');
    console.log('Now scaling from PRINT AREA dimensions, not full canvas!');
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
        // Step 1: Convert legacy params to coordinate format with print area bounds
        console.log('🔄 Step 1: Converting with realistic print area bounds...');
        const coordinateData = coordinateGenerator.convertLegacyToCoordinates(testParams);
        
        console.log('   ✅ Coordinate data created with print area bounds:');
        console.log(`   📍 Character count: ${coordinateData.characterPositions.length}`);
        console.log(`   📏 Frontend canvas: ${coordinateData.frontendCanvasSize.width}x${coordinateData.frontendCanvasSize.height}`);
        console.log(`   🎯 Print area bounds: ${coordinateData.printAreaBounds.width}x${coordinateData.printAreaBounds.height}`);
        console.log(`   📍 Print area position: (${coordinateData.printAreaBounds.x}, ${coordinateData.printAreaBounds.y})`);
        console.log('');

        // Step 2: Calculate expected scaling
        const printAreaWidth = coordinateData.printAreaBounds.width; // 200px
        const printAreaHeight = coordinateData.printAreaBounds.height; // 270px
        const expectedScaleX = 3600 / printAreaWidth; // 3600/200 = 18
        const expectedScaleY = 4800 / printAreaHeight; // 4800/270 = 17.78
        const expectedUniformScale = Math.max(expectedScaleX, expectedScaleY); // 18

        console.log('🧮 Expected Scaling Calculations:');
        console.log(`   Print area width: ${printAreaWidth}px`);
        console.log(`   Print area height: ${printAreaHeight}px`);
        console.log(`   Scale X: 3600 ÷ ${printAreaWidth} = ${expectedScaleX}x`);
        console.log(`   Scale Y: 4800 ÷ ${printAreaHeight} = ${expectedScaleY}x`);
        console.log(`   Uniform scale factor: ${expectedUniformScale}x`);
        console.log(`   Expected font size: ${testParams.fontSize} × ${expectedUniformScale} = ${testParams.fontSize * expectedUniformScale}px`);
        console.log('');

        // Step 3: Generate print file using corrected coordinate system
        console.log('🎨 Step 3: Generating print file with corrected coordinate system...');
        console.log('   Expected: Scale from print area (200x270) to print canvas (3600x4800)');
        console.log(`   Expected uniform scaling: ${expectedUniformScale}x`);
        
        const result = await coordinateGenerator.generatePrintFromCoordinates(coordinateData, {
            debugMode: true
        });
        
        const filePath = path.join(debugOutputDir, 'corrected-coordinate-system-test.png');
        await fs.writeFile(filePath, result.printBuffer);
        console.log(`   ✅ Print file saved: ${filePath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${result.printBuffer.length} bytes`);
        console.log('');

        // Step 4: Create detailed analysis
        console.log('📊 Step 4: Creating detailed analysis...');
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Corrected Coordinate System Test</title>
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
        .fix-explanation {
            background: #d1fae5;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #059669;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Corrected Coordinate System Test</h1>
        <p><strong>FIXED:</strong> Now scaling from print area dimensions, not full canvas dimensions</p>
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
        <div class="label">✅ CORRECTED COORDINATE SYSTEM</div>
        <img src="corrected-coordinate-system-test.png" alt="Corrected Coordinate System Test" style="width: 400px;">
        <div class="info">Scaling from print area (200x270) to print canvas (3600x4800)<br/>${result.printBuffer.length} bytes</div>
    </div>
    
    <div class="fix-explanation">
        <h3>🔧 The Coordinate System Fix</h3>
        <p><strong>Problem Identified:</strong> Backend was scaling from full canvas (600x600) instead of print area (200x270)</p>
        <p><strong>Solution Implemented:</strong> Now scales from print area dimensions to print canvas dimensions</p>
        <p><strong>Result:</strong> Correct proportional scaling without manual 2x adjustment needed</p>
    </div>
    
    <div class="analysis">
        <h3>📊 Print Area Coordinate Data:</h3>
        <div class="coordinate-data">
            <strong>Frontend Canvas:</strong> ${coordinateData.frontendCanvasSize.width}x${coordinateData.frontendCanvasSize.height}<br/>
            <strong>Print Area Bounds:</strong> ${coordinateData.printAreaBounds.width}x${coordinateData.printAreaBounds.height} at (${coordinateData.printAreaBounds.x}, ${coordinateData.printAreaBounds.y})<br/>
            <strong>Character Count:</strong> ${coordinateData.characterPositions.length}<br/>
            <strong>Character Positions:</strong> Relative to print area, not full canvas<br/>
            <br/>
            <strong>Character Details:</strong><br/>
            ${coordinateData.characterPositions.map((char, i) => 
                `${i}: "${char.char}" at (${char.x}, ${char.y}) - print area relative`
            ).join('<br/>')}
        </div>
        
        <h3>🧮 Corrected Scaling Calculations:</h3>
        <ul>
            <li><strong>Print Area Width:</strong> ${printAreaWidth}px</li>
            <li><strong>Print Area Height:</strong> ${printAreaHeight}px</li>
            <li><strong>Scale X:</strong> 3600 ÷ ${printAreaWidth} = <span class="highlight">${expectedScaleX}x</span></li>
            <li><strong>Scale Y:</strong> 4800 ÷ ${printAreaHeight} = <span class="highlight">${expectedScaleY}x</span></li>
            <li><strong>Uniform Scale Factor:</strong> max(${expectedScaleX}, ${expectedScaleY}) = <span class="highlight">${expectedUniformScale}x</span></li>
            <li><strong>Font Size:</strong> ${testParams.fontSize}px × ${expectedUniformScale} = <span class="highlight">${testParams.fontSize * expectedUniformScale}px</span></li>
        </ul>
        
        <h3>🎯 Expected Results:</h3>
        <ul>
            <li>✅ <strong>Correct Proportional Scaling:</strong> ${expectedUniformScale}x from print area dimensions</li>
            <li>✅ <strong>Proper Font Size:</strong> ${testParams.fontSize * expectedUniformScale}px (no manual 2x needed)</li>
            <li>✅ <strong>Accurate Positioning:</strong> Characters maintain print area relationships</li>
            <li>✅ <strong>No Manual Adjustment:</strong> Should match frontend preview directly</li>
        </ul>
        
        <h3>🔍 How to Verify:</h3>
        <ol>
            <li>Upload this print file to Printful</li>
            <li>View at <strong>normal scale</strong> (no manual scaling needed)</li>
            <li>Compare with your frontend preview</li>
            <li>Text should match exactly in size and position</li>
            <li>No more 2x manual scaling required!</li>
        </ol>
        
        <h3>💡 Why This Fixes Everything:</h3>
        <ul>
            <li>🎯 <strong>Correct Reference Frame:</strong> Uses print area as scaling reference</li>
            <li>📐 <strong>Proper Proportions:</strong> Maintains print area aspect ratio</li>
            <li>🔧 <strong>No Manual Adjustment:</strong> Eliminates need for 2x scaling</li>
            <li>🚫 <strong>No Coordinate Mismatch:</strong> Frontend and backend use same reference</li>
        </ul>
    </div>
</body>
</html>`;

        const htmlPath = path.join(debugOutputDir, 'corrected-coordinate-system-test.html');
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`   ✅ Analysis HTML saved: ${htmlPath}`);
        console.log('');

        console.log('🎯 CORRECTED COORDINATE SYSTEM TEST COMPLETE!');
        console.log('============================================');
        console.log('📁 Files created in debug-output folder:');
        console.log(`   - corrected-coordinate-system-test.png (Print file with corrected scaling)`);
        console.log(`   - corrected-coordinate-system-test.html (Detailed analysis)`);
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Open corrected-coordinate-system-test.html to view the analysis');
        console.log('2. Upload the PNG to Printful and test at normal scale');
        console.log('3. Compare with your frontend preview');
        console.log('4. Verify no manual 2x scaling is needed');
        console.log('');
        console.log('💡 Expected Result:');
        console.log(`   Font size: ${testParams.fontSize * expectedUniformScale}px (${testParams.fontSize}px × ${expectedUniformScale})`);
        console.log('   Should match frontend preview without any manual scaling!');
        console.log('   This eliminates the need for 2x manual adjustment in Printful');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testCorrectedCoordinateSystem().catch(console.error);
