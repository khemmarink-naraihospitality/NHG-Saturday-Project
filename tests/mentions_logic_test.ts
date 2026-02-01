
// Mocking the user parsing logic from useBoardStore.ts

const activeBoardMembers = [
    { user_id: 'u1', profiles: { full_name: 'John Doe', email: 'john@example.com' } },
    { user_id: 'u2', profiles: { full_name: 'Jane Smith', email: 'jane@test.co' } },
    { user_id: 'u3', profiles: { full_name: 'Bob', email: 'bob@builder.com' } },
];

function testMentionsLogic(content: string) {
    console.log(`\nTesting content: "${content}"`);

    // NEW LOGIC
    // 1. Regex: Must start with space, start-of-line, or '>' (HTML).
    // Capture group 2 is the name.
    const mentionRegex = /(?:^|\s|>)(@([a-zA-Z0-9_ ]+?))(?=$|\s|<|[.,!?])/g;

    const allMatches = [...content.matchAll(mentionRegex)];

    if (allMatches.length > 0 && activeBoardMembers.length > 0) {
        // Group 2 is the Name part. Group 1 is @Name.
        const names = allMatches.map(m => m[2].trim());
        const uniqueNames = new Set(names);

        console.log('  Found matches:', Array.from(uniqueNames));

        uniqueNames.forEach((name) => {
            const targetMember = activeBoardMembers.find(m => {
                const full_name = (m.profiles?.full_name || '').toLowerCase();
                const email_user = (m.profiles?.email?.split('@')[0] || '').toLowerCase();
                const search = name.toLowerCase();

                // Strict matching strategies
                if (full_name === search) return true;
                if (email_user === search) return true;

                // Optional: Allow if fullname StartsWith search? (For manual partially typed mentions?)
                // But the UI usually auto-completes to full name.
                // Let's stick to Exact Match first.

                return false;
            });

            if (targetMember) {
                console.log(`  MATCH: "${name}" -> ${targetMember.profiles?.full_name} (${targetMember.user_id})`);
            } else {
                console.log(`  NO MATCH for: "${name}"`);
            }
        });
    } else {
        console.log('  No matches found.');
    }
}

// Test Cases
testMentionsLogic('Hello @John'); // Should fail exact match unless we allow "starts with" or user is just "John" (user is John Doe)
// Wait, if UI inserts "John Doe", then text is "@John Doe".
// If user types "@John", and doesn't select, we probably shouldn't notify "John Doe" unless we want sloppy matching.
// But lets assume standard flow:
testMentionsLogic('Hello @John Doe');

testMentionsLogic('Hey @Jane Smith, how are you?');
testMentionsLogic('Contact me at email@example.com'); // EXPECT: No match found.
testMentionsLogic('Testing @Bob and @UnknownUser'); // EXPECT: Match Bob (if Bob is exact name? yes user u3 is "Bob").
testMentionsLogic('<span class="mention">@John Doe</span>'); // EXPECT: Match John Doe
