import { XMLParser, XMLValidator } from "fast-xml-parser";

const DEFAULT_MAX_XML_BYTES = 5 * 1024 * 1024; // 5 MB

const DEFAULT_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  cdataPropName: "__cdata",
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  // Disables entity resolution and DTD loading to protect against XXE attacks
  processEntities: false,
  htmlEntities: false,
  stopNodes: ["*.pre", "*.script"],
};

/**
 * Validates and safely parses an XML, RSS, or Atom feed string.
 * Disables DTD entity expansion (XXE protection) and enforces size limits.
 *
 * @param {string} xmlString Raw XML content
 * @param {object} [options={}]
 * @param {number} [options.maxSizeBytes=5242880] Max allowed input size
 * @param {object} [options.parserOptions={}] Custom fast-xml-parser overrides
 * @returns {object} Parsed XML JSON object
 */
export function parseSafeXml(xmlString, options = {}) {
  if (!xmlString || typeof xmlString !== "string") {
    throw new Error("Invalid XML input: Content must be a non-empty string.");
  }

  const maxBytes = options.maxSizeBytes || DEFAULT_MAX_XML_BYTES;
  const byteLength = Buffer.byteLength(xmlString, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(
      `XML payload size (${byteLength} bytes) exceeds the maximum allowed limit of ${maxBytes} bytes.`
    );
  }

  // Pre-check for DOCTYPE entity injection attempts
  if (/<!ENTITY/i.test(xmlString) || /<!DOCTYPE[^>]*\[/i.test(xmlString)) {
    throw new Error("Security violation: DOCTYPE external entity declarations are prohibited.");
  }

  // Validate XML syntax
  const validationResult = XMLValidator.validate(xmlString, {
    allowBooleanAttributes: true,
  });

  if (validationResult !== true) {
    const errorMsg =
      validationResult && validationResult.err
        ? `XML syntax error at line ${validationResult.err.line}: ${validationResult.err.msg}`
        : "Malformed XML document.";
    throw new Error(errorMsg);
  }

  const parser = new XMLParser({
    ...DEFAULT_PARSER_OPTIONS,
    ...(options.parserOptions || {}),
  });

  return parser.parse(xmlString);
}
