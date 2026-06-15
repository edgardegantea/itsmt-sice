import { StyleSheet } from '@react-pdf/renderer'

export const commonStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 54,
    paddingBottom: 70,
    paddingHorizontal: 54,
    backgroundColor: '#fff',
  },
  // Header
  hdrRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  hdrLogo:   { width: 44, height: 44, marginRight: 10 },
  hdrCenter: { flex: 1 },
  hdrInst:   { fontSize: 10.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: '#1a3a5c' },
  hdrSub:    { fontSize: 7.5, color: '#555', textAlign: 'center', marginTop: 2 },
  hdrDate:   { fontSize: 7, color: '#777', textAlign: 'center', marginTop: 1 },
  hdrMeta:   { fontSize: 6.5, color: '#777', textAlign: 'right', lineHeight: 1.8 },
  hdrRule:   { borderBottomWidth: 2, borderBottomColor: '#1a3a5c', marginBottom: 12 },
  // Folio
  folio:     { fontSize: 7.5, color: '#555', textAlign: 'right', marginBottom: 8 },
  // Title
  titleBox:  {
    borderWidth: 1, borderColor: '#1a3a5c',
    paddingVertical: 5, marginBottom: 12, textAlign: 'center',
  },
  titleText: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#1a3a5c', textAlign: 'center' },
  // Section heading
  section:   {
    fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1a3a5c',
    borderBottomWidth: 1, borderBottomColor: '#1a3a5c',
    marginTop: 10, marginBottom: 5, paddingBottom: 2,
  },
  // Data table
  dataTable: { borderWidth: 1, borderColor: '#ccc', marginBottom: 8 },
  dataRow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  dataRowLast: { flexDirection: 'row' },
  dataLabel: { width: '38%', fontFamily: 'Helvetica-Bold', fontSize: 8.5, backgroundColor: '#f0f4f8', padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  dataValue: { flex: 1, fontSize: 8.5, padding: 4 },
  dataLabel2: { width: '22%', fontFamily: 'Helvetica-Bold', fontSize: 8.5, backgroundColor: '#f0f4f8', padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  dataValue2: { width: '28%', fontSize: 8.5, padding: 4, borderRightWidth: 1, borderRightColor: '#ccc' },
  // Firma blocks
  firmasRow:   { flexDirection: 'row', marginTop: 28 },
  firmaCell:   { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  firmaSpace:  { height: 40 },
  firmaLine:   { borderTopWidth: 0.8, borderTopColor: '#333', width: '100%', marginBottom: 4 },
  firmaNombre: { fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', color: '#1a3a5c' },
  firmaRol:    { fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 },
  // Footer
  footer:    { fontSize: 7, color: '#777', textAlign: 'center', marginTop: 14, borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 5 },
})
