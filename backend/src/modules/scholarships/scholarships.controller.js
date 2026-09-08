import {
  getPublicScholarships,
  getPublicScholarship,
  listScholarshipsForAdmin,
  getScholarshipForAdmin,
  createScholarshipForAdmin,
  updateScholarshipForAdmin,
  deleteScholarshipForAdmin,
} from "./scholarships.service.js";

export function createScholarshipsController({
  service = {
    getPublicScholarships,
    getPublicScholarship,
    listScholarshipsForAdmin,
    getScholarshipForAdmin,
    createScholarshipForAdmin,
    updateScholarshipForAdmin,
    deleteScholarshipForAdmin,
  },
} = {}) {
  return {
    list: async (_req, res) => {
      try {
        const scholarships = await service.getPublicScholarships();
        return res.status(200).json({ success: true, scholarships });
      } catch (error) {
        console.error("Fetch public scholarships error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch scholarships." });
      }
    },

    detail: async (req, res) => {
      try {
        const scholarship = await service.getPublicScholarship(req.params.slug);
        if (!scholarship) {
          return res.status(404).json({ success: false, message: "Scholarship not found." });
        }
        return res.status(200).json({ success: true, scholarship });
      } catch (error) {
        console.error("Fetch public scholarship error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch scholarship." });
      }
    },

    adminList: async (_req, res) => {
      try {
        const scholarships = await service.listScholarshipsForAdmin();
        return res.status(200).json({ success: true, scholarships });
      } catch (error) {
        console.error("Fetch admin scholarships error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch scholarships." });
      }
    },

    adminDetail: async (req, res) => {
      try {
        const scholarship = await service.getScholarshipForAdmin(req.params.id);
        if (!scholarship) {
          return res.status(404).json({ success: false, message: "Scholarship not found." });
        }
        return res.status(200).json({ success: true, scholarship });
      } catch (error) {
        console.error("Fetch admin scholarship error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch scholarship." });
      }
    },

    adminCreate: async (req, res) => {
      try {
        const scholarship = await service.createScholarshipForAdmin(res.locals.validated.body);
        return res.status(201).json({
          success: true,
          message: "Scholarship created successfully.",
          scholarship,
        });
      } catch (error) {
        console.error("Create scholarship error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A scholarship with this slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected university or country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to create scholarship." });
      }
    },

    adminUpdate: async (req, res) => {
      try {
        const scholarship = await service.updateScholarshipForAdmin(
          res.locals.validated.params.id,
          res.locals.validated.body
        );
        return res.status(200).json({
          success: true,
          message: "Scholarship updated successfully.",
          scholarship,
        });
      } catch (error) {
        console.error("Update scholarship error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Scholarship not found." });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A scholarship with this slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected university or country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to update scholarship." });
      }
    },

    adminDelete: async (req, res) => {
      try {
        await service.deleteScholarshipForAdmin(res.locals.validated.params.id);
        return res.status(200).json({ success: true, message: "Scholarship deleted successfully." });
      } catch (error) {
        console.error("Delete scholarship error:", error);
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Scholarship not found." });
        }
        return res.status(500).json({ success: false, message: "Failed to delete scholarship." });
      }
    },
  };
}
