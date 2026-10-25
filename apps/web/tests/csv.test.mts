import assert from 'node:assert/strict'
import { CsvError, extractCsvBlock, parseCsv } from '../server/utils/csv.ts'

let passed = 0
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`) }
const fails = (text: string, re: RegExp) => assert.throws(() => parseCsv(text), (e: Error) => e instanceof CsvError && re.test(e.message))

test('numbers are recognised, text is left alone', () => {
  const t = parseCsv('product,units,price\nRice,3,12.5\nOil,10,8')
  assert.deepEqual(t.columns, ['product', 'units', 'price'])
  assert.deepEqual(t.rows, [['Rice', 3, 12.5], ['Oil', 10, 8]])
})

test('identifiers with leading zeros stay text, and thousands separators are understood when quoted', () => {
  const t = parseCsv('id,amount\n007,"1,234.50"\n0123,-5')
  assert.deepEqual(t.rows, [['007', 1234.5], ['0123', -5]])
})

test('quoted fields can hold commas, quotes and line breaks', () => {
  const t = parseCsv('name,note\n"Smith, Jo","said ""hi"""\n"two\nlines",x')
  assert.deepEqual(t.rows, [['Smith, Jo', 'said "hi"'], ['two\nlines', 'x']])
})

test('Windows line endings, a byte-order mark and a missing final newline are fine', () => {
  const t = parseCsv('\uFEFFa,b\r\n1,2\r\n3,4')
  assert.deepEqual(t.columns, ['a', 'b'])
  assert.deepEqual(t.rows, [[1, 2], [3, 4]])
})

test('empty values become null and short rows are padded', () => {
  const t = parseCsv('a,b,c\n1,,3\n4')
  assert.deepEqual(t.rows, [[1, null, 3], [4, null, null]])
})

test('formula-looking text stays text', () => {
  const t = parseCsv('a\n=1+1\n+cmd\n@SUM(A1)')
  assert.deepEqual(t.rows, [['=1+1'], ['+cmd'], ['@SUM(A1)']])
})

test('bad input gives a plain explanation', () => {
  fails('', /no data/)
  fails('a,b\n"unclosed,1', /never closed/)
  fails('a,,c\n1,2,3', /needs a name/)
  fails('a,A\n1,2', /same name/)
  fails('a,b\n1,2,3', /more values/)
})

test('very large tables are refused', () => {
  fails('a\n' + '1\n'.repeat(5100), /more than 5000 rows/)
})

test('a table can be found inside a chat message', () => {
  const fenced = extractCsvBlock('Here you go:\n```csv\nmonth,sales\nJan,10\nFeb,20\n```\nthanks')
  assert.equal(fenced, 'month,sales\nJan,10\nFeb,20')
  const loose = extractCsvBlock('Please summarise this\nmonth,sales\nJan,10\nFeb,20\nMar,30\nThanks!')
  assert.equal(loose, 'month,sales\nJan,10\nFeb,20\nMar,30')
  assert.equal(extractCsvBlock('Hello, how are you?'), undefined)
})

console.log(`\n${passed} passed`)
