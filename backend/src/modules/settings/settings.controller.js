import { getSettingsForAdmin, updateSettingsForAdmin } from "./settings.service.js";

export function createSettingsController({
  service = { getSettingsForAdmin, updateSettingsForAdmin },
} = {}) {
  return {
    adminGet: async (_req, res) => {
      try {
        const settings = await service.getSettingsForAdmin();
        return res.status(200).json({ success: true, settings });
      } catch (error) {
        console.error("Fetch admin settings error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch settings." });
      }
    },

    adminUpdate: async (req, res) => {
      try {
        const settings = await service.updateSettingsForAdmin(res.locals.validated.body);
        return res.status(200).json({
          success: true,
          message: "Settings updated successfully.",
          settings,
        });
      } catch (error) {
        console.error("Update admin settings error:", error);
        if (error.code === "P2002") {
          return res.status(409).json({ success: false, message: "Settings conflict. Please retry." });
        }
        if (error.code === "P2025") {
          return res.status(404).json({ success: false, message: "Settings not found." });
        }
        return res.status(500).json({ success: false, message: "Failed to update settings." });
      }
    },
  };
}
