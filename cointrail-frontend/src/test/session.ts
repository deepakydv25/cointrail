export function makeToken(exp = Math.floor(Date.now() / 1000) + 3600, subject = 'owner@example.com') {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'HS256' })}.${encode({ sub: subject, exp })}.c2ln`;
}
