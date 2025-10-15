const PrintGenerator = require('./services/print-generator');
const path = require('path');
const fs = require('fs').promises;

const printGenerator = new PrintGenerator();

async function testFontScalingFix() {
    console.log('🔧 TESTING FONT SCALING FIX');
    console.log('============================');
    console.log('Testing the 2x font scaling fix to correct 50% size discrepancy');
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
        // Generate print file with the fix
        console.log('🎨 Generating Print File with 2x Font Scaling Fix...');
        console.log('   Expected: Font size should be 640px (40px × 8 × 2) instead of 320px');
        
        const result = await printGenerator.generatePrintFile(testParams, {
            debugMode: true
        });
        
        const filePath = path.join(debugOutputDir, 'font-scaling-fix-test.png');
        await fs.writeFile(filePath, result.printBuffer);
        console.log(`   ✅ Print file saved: ${filePath}`);
        console.log(`   📏 Dimensions: 3600x4800`);
        console.log(`   📦 Size: ${result.printBuffer.length} bytes`);
        console.log('');

        // Create comparison HTML
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Font Scaling Fix Test</title>
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Font Scaling Fix Test</h1>
        <p><strong>Test Parameters:</strong></p>
        <ul>
            <li>Text: "${testParams.text}"</li>
            <li>Font: ${testParams.fontFamily}</li>
            <li>Size: ${testParams.fontSize}px</li>
            <li>Color: ${testParams.color}</li>
            <li>Output: 3600x4800 (Print Size)</li>
        </ul>
        <p><strong>Fix Applied:</strong> Font scaling calculation doubled to correct 50% size discrepancy</p>
    </div>
    
    <div class="image-container">
        <div class="label">✅ FIXED: 2x Font Scaling</div>
        <img src="font-scaling-fix-test.png" alt="Font Scaling Fix Test" style="width: 400px;">
        <div class="info">Font size: 640px (40px × 8 × 2)<br/>${result.printBuffer.length} bytes</div>
    </div>
    
    <div class="analysis">
        <h3>📊 Expected Results:</h3>
        <ul>
            <li><strong>Font Size:</strong> Should be <span class="highlight">640px</span> instead of 320px</li>
            <li><strong>Visual Size:</strong> Should match frontend preview when displayed in Printful</li>
            <li><strong>No Manual Scaling:</strong> Should not need 2x scaling in Printful mockup generator</li>
        </ul>
        
        <h3>🔍 How to Verify:</h3>
        <ol>
            <li>Upload this print file to Printful</li>
            <li>View it in Printful's mockup generator at <strong>normal scale</strong></li>
            <li>Compare with your frontend preview</li>
            <li>Text should be identical size without manual scaling</li>
        </ol>
        
        <h3>🎯 Success Criteria:</h3>
        <ul>
            <li>✅ Font appears thick (Cherry Bomb One loaded correctly)</li>
            <li>✅ Text size matches frontend preview</li>
            <li>✅ No need for manual 2x scaling in Printful</li>
            <li>✅ Text is properly centered</li>
        </ul>
        
        <h3>💡 Technical Details:</h3>
        <p><strong>Before Fix:</strong> <code>fontSize × scaleFactor = 40 × 8 = 320px</code></p>
        <p><strong>After Fix:</strong> <code>fontSize × scaleFactor × 2 = 40 × 8 × 2 = 640px</code></p>
        <p>This corrects the 50% size discrepancy identified through manual scaling tests.</p>
    </div>
</body>
</html>`;

        const htmlPath = path.join(debugOutputDir, 'font-scaling-fix-test.html');
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`   ✅ Test HTML saved: ${htmlPath}`);
        console.log('');

        console.log('🎯 FONT SCALING FIX TEST COMPLETE!');
        console.log('==================================');
        console.log('📁 Files created in debug-output folder:');
        console.log(`   - font-scaling-fix-test.png (Print file with 2x font scaling)`);
        console.log(`   - font-scaling-fix-test.html (Test results viewer)`);
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Open font-scaling-fix-test.html to view the results');
        console.log('2. Upload the PNG to Printful and test at normal scale');
        console.log('3. Compare with your frontend preview');
        console.log('4. Verify no manual 2x scaling is needed');
        console.log('');
        console.log('💡 Expected Result:');
        console.log('   Font size should now be 640px (instead of 320px)');
        console.log('   Print file should match frontend preview without manual scaling');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testFontScalingFix().catch(console.error);
