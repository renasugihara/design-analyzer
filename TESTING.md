# Testing Checklist

## Before Each Deploy

### Happy Path (Free Tier)
- [ ] Enter URL -> Analysis completes
- [ ] See 3 issues with natural language descriptions
- [ ] No specific code mentions in descriptions
- [ ] Mega prompt shows as locked/skeleton
- [ ] No copy buttons for individual prompts
- [ ] "Upgrade" CTA visible

### Happy Path (Paid Tier - Manual Test)
- [ ] Modify API call to tier: 'paid'
- [ ] See 5 issues with specific descriptions
- [ ] Code mentions in descriptions (shadow-xl, zinc-50, etc.)
- [ ] Mega prompt is copyable
- [ ] Individual copy buttons work
- [ ] Clipboard contains correct prompts

### Error Handling
- [ ] Invalid URL -> Shows validation error
- [ ] Unreachable URL -> Shows "Couldn't load" error
- [ ] Timeout -> Shows timeout error with retry

### Test URLs
- [ ] Test 5 generic sites -> 3+ issues each
- [ ] Test 5 professional sites -> 0-2 issues each
- [ ] Accuracy: 80%+ correct classification

### Mobile
- [ ] iPhone Safari -> Layout works, buttons work
- [ ] Android Chrome -> Layout works, buttons work
