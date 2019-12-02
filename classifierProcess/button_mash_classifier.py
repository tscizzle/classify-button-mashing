"""
Classify different people's random button mashing
"""

from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer


class ButtonMashClassifier:
    def __init__(self, button_mashes, labels):
        """
        :param string[] button_mashes: e.g. ["epfilwjmcfpojwqc", "woij;qfclwqncl"]
        :param string[] labels: e.g. ["tyler", "pre"]
        """
        # Features we use are char n-grams of length 1 to 3
        self.vectorizer = TfidfVectorizer(
            input="content", analyzer="char", ngram_range=(1, 3)
        )

        X = self.vectorizer.fit_transform(button_mashes)
        y = labels

        self.classifier = LinearSVC()
        self.classifier.fit(X, y)

    def predict(self, button_mashes):
        """
        :param string[] button_mashes: e.g. ["epfilwjmcfpojwqc", "woij;qfclwqncl"]
        :return string[] predicted_labels: e.g. ["tyler", "pre"]
        """
        # transform the input so it looks like the original data this classifier was trained on
        X = self.vectorizer.transform(button_mashes)

        predicted_labels = self.classifier.predict(X)

        return predicted_labels
