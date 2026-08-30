import re

with open('src/components/Booking.tsx', 'r') as f:
    content = f.read()

# Replace all <div className="space-y-2"> to <motion.div variants={itemVariants} className="space-y-2">
# and the matching </div> to </motion.div>
# Since it's a bit complex with regex, let's just do it directly.

content = re.sub(
    r'<motion.div variants={itemVariants} className="space-y-2">(.*?)</label>\s*<input(.*?)/>\s*</div>',
    r'<motion.div variants={itemVariants} className="space-y-2">\1</label>\n                <input\2/>\n              </motion.div>',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<motion.div variants={itemVariants} className="space-y-2">(.*?)</label>\s*<select(.*?)</select>\s*</div>',
    r'<motion.div variants={itemVariants} className="space-y-2">\1</label>\n                <select\2</select>\n              </motion.div>',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<motion.div variants={itemVariants} className="space-y-2 text-center">(.*?)</label>\s*<input(.*?)/>\s*<p(.*?)</p>\s*</div>',
    r'<motion.div variants={itemVariants} className="space-y-2 text-center">\1</label>\n                <input\2/>\n                <p\3</p>\n              </motion.div>',
    content,
    flags=re.DOTALL
)

with open('src/components/Booking.tsx', 'w') as f:
    f.write(content)
