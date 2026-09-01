import {
  getPublicCountries,
  getPublicCountry,
} from "./countries.service.js";

export function createCountriesController({ service = { getPublicCountries, getPublicCountry } } = {}) {
  return {
    list: async (_req, res) => {
      try {
        const countries = await service.getPublicCountries();
        return res.status(200).json({ success: true, countries });
      } catch (error) {
        console.error("Fetch public countries error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch countries.",
        });
      }
    },

    detail: async (req, res) => {
      try {
        const country = await service.getPublicCountry(req.params.slug);
        if (!country) {
          return res.status(404).json({
            success: false,
            message: "Country not found.",
          });
        }
        return res.status(200).json({ success: true, country });
      } catch (error) {
        console.error("Fetch public country error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch country.",
        });
      }
    },
  };
}
