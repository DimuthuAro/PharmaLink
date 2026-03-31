from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

# example true vs predicted (replace with your model output)
y_true = [0,1,2,1,0,2,1,0,2,2]
y_pred = [0,1,2,0,0,2,1,0,2,1]

cm = confusion_matrix(y_true, y_pred)

disp = ConfusionMatrixDisplay(confusion_matrix=cm)
disp.plot()

plt.title("Confusion Matrix")
plt.savefig("confusion_matrix.png", dpi=300)
plt.show()