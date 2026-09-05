import {
  getPublicCountries,
  getPublicCountry,
  listCountriesForAdmin,
  getCountryForAdmin,
  createCountryForAdmin,
  updateCountryForAdmin,
  deleteCountryForAdmin,
} from "./countries.service.js";

export function createCountriesController({
  service = {
    getPublicCountries,
    getPublicCountry,
    listCountriesForAdmin,
    getCountryForAdmin,
    createCountryForAdmin,
    updateCountryForAdmin,
    deleteCountryForAdmin,
  },
} = {}) {
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

    adminList: async (_req, res) => {
      try {
        const countries = await service.listCountriesForAdmin();
        return res.status(200).json({ success: true, countries });
      } catch (error) {
        console.error("Fetch admin countries error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch countries." });
      }
    },

    adminDetail: async (req, res) => {
      try {
        const country = await service.getCountryForAdmin(req.params.id);
        if (!country) {
          return res.status(404).json({ success: false, message: "Country not found." });
        }
        return res.status(200).json({ success: true, country });
      } catch (error) {
        console.error("Fetch admin country error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch country." });
      }
    },

    adminCreate: async (req, res) => {
      try {
        const country = await service.createCountryForAdmin(res.locals.validated.body);
        return res.status(201).json({
          success: true,
          message: "Country created successfully.",
          country,
        });
      } catch (error) {
        console.error("Create country error:", error);
        if (error.code === "NAME_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A country with this ID or name already exists." });
        }
        return res.status(500).json({ success: false, message: "Failed to create country." });
      }
    },

    adminUpdate: async (req, res) => {
      try {
        const country = await service.updateCountryForAdmin(
          res.locals.validated.params.id,
          res.locals.validated.body
        );
        return res.status(200).json({
          success: true,
          message: "Country updated successfully.",
          country,
        });
      } catch (error) {
        console.error("Update country error:", error);
        if (error.code === "NAME_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Country not found." });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A country with this name already exists." });
        }
        return res.status(500).json({ success: false, message: "Failed to update country." });
      }
    },

    adminDelete: async (req, res) => {
      try {
        await service.deleteCountryForAdmin(res.locals.validated.params.id);
        return res.status(200).json({ success: true, message: "Country deleted successfully." });
      } catch (error) {
        console.error("Delete country error:", error);
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Country not found." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({
            success: false,
            message: "Cannot delete a country that still has universities, articles, or other records linked to it.",
          });
        }
        return res.status(500).json({ success: false, message: "Failed to delete country." });
      }
    },
  };
}
