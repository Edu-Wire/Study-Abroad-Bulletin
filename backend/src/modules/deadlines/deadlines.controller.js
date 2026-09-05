import {
  listDeadlinesForAdmin,
  getDeadlineForAdmin,
  createDeadlineForAdmin,
  updateDeadlineForAdmin,
  deleteDeadlineForAdmin,
} from "./deadlines.service.js";

export function createDeadlinesController({
  service = {
    listDeadlinesForAdmin,
    getDeadlineForAdmin,
    createDeadlineForAdmin,
    updateDeadlineForAdmin,
    deleteDeadlineForAdmin,
  },
} = {}) {
  return {
    adminList: async (_req, res) => {
      try {
        const deadlines = await service.listDeadlinesForAdmin();
        return res.status(200).json({ success: true, deadlines });
      } catch (error) {
        console.error("Fetch admin deadlines error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch deadlines." });
      }
    },

    adminDetail: async (req, res) => {
      try {
        const deadline = await service.getDeadlineForAdmin(req.params.id);
        if (!deadline) {
          return res.status(404).json({ success: false, message: "Deadline not found." });
        }
        return res.status(200).json({ success: true, deadline });
      } catch (error) {
        console.error("Fetch admin deadline error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch deadline." });
      }
    },

    adminCreate: async (req, res) => {
      try {
        const deadline = await service.createDeadlineForAdmin(res.locals.validated.body);
        return res.status(201).json({
          success: true,
          message: "Deadline created successfully.",
          deadline,
        });
      } catch (error) {
        console.error("Create deadline error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A deadline with this ID or slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to create deadline." });
      }
    },

    adminUpdate: async (req, res) => {
      try {
        const deadline = await service.updateDeadlineForAdmin(
          res.locals.validated.params.id,
          res.locals.validated.body
        );
        return res.status(200).json({
          success: true,
          message: "Deadline updated successfully.",
          deadline,
        });
      } catch (error) {
        console.error("Update deadline error:", error);
        if (error.code === "SLUG_TAKEN") {
          return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Deadline not found." });
        }
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "A deadline with this slug already exists." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ success: false, message: "Selected country does not exist." });
        }
        return res.status(500).json({ success: false, message: "Failed to update deadline." });
      }
    },

    adminDelete: async (req, res) => {
      try {
        await service.deleteDeadlineForAdmin(res.locals.validated.params.id);
        return res.status(200).json({ success: true, message: "Deadline deleted successfully." });
      } catch (error) {
        console.error("Delete deadline error:", error);
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Deadline not found." });
        }
        return res.status(500).json({ success: false, message: "Failed to delete deadline." });
      }
    },
  };
}
