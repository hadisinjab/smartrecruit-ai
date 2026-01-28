
export const extractAgeAndExperience = (app: any) => {
  let age: number | undefined = app.candidate_age;
  let experience: number = app.experience || 0;

  if ((age === undefined || experience === 0) && app.answers && Array.isArray(app.answers)) {
    app.answers.forEach((answer: any) => {
      if (answer.value) {
        const valueStr = String(answer.value).toLowerCase();
        
        // Look for age-related patterns - more specific patterns first
        if (age === undefined) {
          const agePatterns = [
            /i am (\d+) years? old/,
            /my age is (\d+)/,
            /age:?(\d+)/,
            /عمري (\d+)/,
            /العمر:?(\d+)/,
            /عمر:?(\d+)/
          ];
          
          for (const pattern of agePatterns) {
            const match = valueStr.match(pattern);
            if (match) {
              age = parseInt(match[1]);
              break;
            }
          }
          
          // If no specific age pattern found, look for general age keywords
          if (age === undefined && (valueStr.includes('age') || valueStr.includes('عمر'))) {
            const ageMatch = valueStr.match(/\d+/);
            if (ageMatch) {
              const num = parseInt(ageMatch[0]);
              // Only consider it age if it's a reasonable age range (15-100)
              if (num >= 15 && num <= 100) {
                age = num;
              }
            }
          }
        }
        
        // Look for experience-related patterns - more specific patterns first
        if (experience === 0) {
          const expPatterns = [
            /(\d+) years? of experience/,
            /experience:?(\d+)/,
            /خبرة (\d+)/,
            /سنوات الخبرة:?(\d+)/,
            /(\d+) سنو?ات خبرة/,
            /(\d+) years? experience/,
            /(\d+)\s+years?(?!.*old)/, // Capture "5 years" but not "5 years old"
            /(\d+)\s+سنو?ات(?!.*عمر)/
          ];
          
          for (const pattern of expPatterns) {
            const match = valueStr.match(pattern);
            if (match) {
              experience = parseInt(match[1]);
              break;
            }
          }
          
          // If no specific experience pattern found, look for general experience keywords
          if (experience === 0 && (valueStr.includes('experience') || valueStr.includes('خبرة'))) {
            const expMatch = valueStr.match(/\d+/);
            if (expMatch) {
              const num = parseInt(expMatch[0]);
              // Only consider it experience if it's a reasonable range (0-50)
              if (num >= 0 && num <= 50) {
                experience = num;
              }
            }
          }
        }
      }
    });
  }

  return { age, experience };
};
