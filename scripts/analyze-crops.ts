import sharp from 'sharp';

async function analyze() {
  console.log('Analyzing crops for 4:5 ratio...');
  // Photo 1: 769 x 1024
  // Photo 2: 769 x 1024
  // Photo 3: 768 x 1024

  // Target 4:5 ratio. Width 768, Height 960 (768 * 1.25)
  // Let's test crop boxes:
  // For each photo, we want:
  // - Eyes at ~34% of 960 = ~326px from top of crop
  // - Top of head at ~7-8% of 960 = ~67-76px from top of crop
}

analyze();
