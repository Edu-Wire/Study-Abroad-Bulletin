import {
  getPublicUniversities,
  getPublicUniversity,
} from "./universities.service.js";

export function createUniversitiesController({
  service = { getPublicUniversities, getPublicUniversity },
} = {}) {
  return {
    list: async (_req, res) => {
      try {
        const universities = await service.getPublicUniversities();
        return res.status(200).json({ success: true, universities });
      } catch (error) {
        console.error("Fetch public universities error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch universities.",
        });
      }
    },

    detail: async (req, res) => {
      try {
        const university = await service.getPublicUniversity(req.params.slug);
        if (!university) {
          return res.status(404).json({
            success: false,
            message: "University not found.",
          });
        }
        return res.status(200).json({ success: true, university });
      } catch (error) {
        console.error("Fetch public university error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch university.",
        });
      }
    },
  };
}
