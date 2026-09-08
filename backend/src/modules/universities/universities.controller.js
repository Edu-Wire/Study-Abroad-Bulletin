import {
  getPublicUniversities,
  getPublicUniversity,
  listUniversitiesForAdmin,
  getUniversityForAdmin,
  createUniversityForAdmin,
  updateUniversityForAdmin,
  deleteUniversityForAdmin,
} from "./universities.service.js";

export function createUniversitiesController({
  service = {
    getPublicUniversities,
    getPublicUniversity,
    listUniversitiesForAdmin,
    getUniversityForAdmin,
    createUniversityForAdmin,
    updateUniversityForAdmin,
    deleteUniversityForAdmin,
  },
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

    adminList: async (_req, res) => {
      try {
        const universities = await service.listUniversitiesForAdmin();
        return res.status(200).json({ success: true, universities });
      } catch (error) {
        console.error("Fetch admin universities error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch universities." });
      }
    },

    adminDetail: async (req, res) => {
      try {
        const university = await service.getUniversityForAdmin(req.params.id);
        if (!university) {
          return res.status(404).json({ success: false, message: "University not found." });
        }
        return res.status(200).json({ success: true, university });
      } catch (error) {
        console.error("Fetch admin university error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch university." });
      }
    },

    adminCreate: async (req, res) => {
      try {
        const university = await service.createUniversityForAdmin(res.locals.validated.body);
        return res.status(201).json({
          success: true,
          message: "University created successfully.",
          university,
        });
      } catch (error) {
        console.error("Create university error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A university with this slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to create university." });
      }
    },

    adminUpdate: async (req, res) => {
      try {
        const university = await service.updateUniversityForAdmin(
          res.locals.validated.params.id,
          res.locals.validated.body
        );
        return res.status(200).json({
          success: true,
          message: "University updated successfully.",
          university,
        });
      } catch (error) {
        console.error("Update university error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "University not found." });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A university with this slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to update university." });
      }
    },

    adminDelete: async (req, res) => {
      try {
        await service.deleteUniversityForAdmin(res.locals.validated.params.id);
        return res.status(200).json({ success: true, message: "University deleted successfully." });
      } catch (error) {
        console.error("Delete university error:", error);
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "University not found." });
        }
        return res.status(500).json({ success: false, message: "Failed to delete university." });
      }
    },
  };
}
