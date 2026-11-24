/** Small blocklist, compared case-insensitively with symbols and trailing digits stripped. */
export const COMMON_PASSWORDS = new Set(
  "password passw0rd password1 password123 password1234 password12345 p@ssword p@ssw0rd p@ssword1 p@ssw0rd1 p@ssword123 p@ssw0rd123 qwerty qwerty123 qwerty1234 qwertyuiop qwerty12345 123456 12345678 123456789 1234567890 12345678910 111111 000000 iloveyou admin admin123 admin1234 admin@123 administrator welcome welcome1 welcome123 welcome@123 welcome1234 letmein letmein123 monkey dragon football baseball sunshine princess master shadow superman batman trustno1 abc123 abcd1234 abcdef abcdefghij abc12345 changeme changeme123 change me secret secret123 login login123 test test123 test1234 tester guest root toor default temp temp123 temporary india india123 india@123 bharat cricket company company123 garvhem garvhem123 garvhem@123 employee employee123 manager manager123 summer winter spring autumn monday friday january december qazwsx qazwsxedc 1qaz2wsx 1q2w3e4r 1q2w3e4r5t zaq12wsx asdfgh asdfghjkl zxcvbn zxcvbnm hello hello123 whatever pass pass123 pass1234 pass@123 computer internet google microsoft".split(
    " ",
  ),
);
